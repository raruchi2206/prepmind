import os
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config.settings import settings
from services.embedding_service import embedding_service
from services.faiss_service import faiss_service
from services.llm_service import RateLimitError, llm_service
from services.rag_service import rag_service
from services.youtube_service import TranscriptError, fetch_transcript
from services.content_classifier import classify_educational_content

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("prepmind_ai_service")
logger.info("[AI SERVICE] URL configured: http://localhost:%s", settings.AI_SERVICE_PORT)
logger.info("[OLLAMA] Base URL configured: %s", settings.OLLAMA_BASE_URL)
logger.info("[OLLAMA] Generation model configured: %s", settings.OLLAMA_LLM_MODEL)
logger.info("[EMBEDDING] Local model configured: %s", settings.EMBEDDING_MODEL)
logger.info("[LLM] Provider: %s | model: %s", llm_service.provider, llm_service.model)

app = FastAPI(
    title="PrepMind AI & Vector Service",
    version="1.0.0",
    description="Python FastAPI service for Ollama embeddings, FAISS vector search, and RAG generation"
)

@app.on_event("startup")
async def warm_up_embedding_model():
    # Load all-MiniLM-L6-v2 in the background so the first upload isn't slowed by model loading
    import asyncio
    asyncio.create_task(embedding_service.warm_up())

@app.exception_handler(RateLimitError)
async def rate_limit_handler(request, exc: RateLimitError):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=429, content={"detail": str(exc)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request / Response Models -----------------

class EmbeddingsRequest(BaseModel):
    texts: List[str]

class ExtractPdfRequest(BaseModel):
    filePath: str

class ExtractImageRequest(BaseModel):
    filePath: str


class YouTubeTranscriptRequest(BaseModel):
    videoId: str = Field(min_length=11, max_length=11)
    languages: Optional[List[str]] = None


class ChunkItem(BaseModel):
    id: str
    text: str
    chunkIndex: int = 0
    metadata: Optional[Dict[str, Any]] = None

class IndexSourceRequest(BaseModel):
    userId: str
    knowledgeSourceId: str
    chunks: List[ChunkItem]
    jobId: Optional[str] = None


class ClassifyContentRequest(BaseModel):
    title: Optional[str] = None
    text: str = Field(min_length=1, max_length=60000)
    wordCount: Optional[int] = None


# Job IDs whose indexing was cancelled by the backend; checked between embedding batches
cancelled_jobs: set = set()
INDEX_BATCH_SIZE = 64

class SearchRequest(BaseModel):
    userId: str
    query: str
    knowledgeSourceIds: Optional[List[str]] = None
    topK: Optional[int] = 5
    minSimilarity: Optional[float] = None

class DeleteSourceRequest(BaseModel):
    userId: str
    knowledgeSourceId: str

class AskRequest(BaseModel):
    query: str
    chunks: List[Dict[str, Any]]
    conversationHistory: Optional[List[Dict[str, str]]] = None

class SummaryRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    title: Optional[str] = "Knowledge Summary"

class NotesRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    title: Optional[str] = "Study Notes"

class QuizRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    title: Optional[str] = "Quiz"
    questionCount: Optional[int] = 5
    difficulty: Optional[str] = "Medium"
    questionType: Optional[str] = "MCQ"
    generationId: Optional[str] = None
    previousQuestionTexts: Optional[List[str]] = None
    retry: bool = False

class PracticePaperRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    title: Optional[str] = "Practice Paper"
    totalMarks: Optional[int] = 60
    difficulty: Optional[str] = "Medium"

class VivaRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    title: Optional[str] = "Viva Examination"
    questionCount: Optional[int] = 5
    difficulty: Optional[str] = "Medium"

class EvaluateRequest(BaseModel):
    question: str
    expectedAnswer: str
    userAnswer: str
    rubric: Optional[str] = None
    maxMarks: Optional[int] = 5

# ----------------- Routes -----------------

@app.get("/health")
async def health_check():
    health = await llm_service.check_health()
    embedding = embedding_service.health_info()
    groq_info = health.get("groq", {})
    ollama_info = health.get("ollama", {})
    return {
        "status": health.get("status", "ok"),
        "service": "prepmind-ai-service",
        "primaryProvider": "groq",
        "fallbackProvider": "ollama",
        "activeProvider": health.get("activeProvider", "groq"),
        "lastSuccessfulProvider": llm_service.last_successful_provider,
        "available": bool(health.get("available")),
        "groq": groq_info,
        "ollama": ollama_info,
        "embedding": {**embedding, "active_embedding": embedding.get("model", "all-minilm"), "dimension": 384},
        "embeddingDimension": 384,
        "threshold": settings.RAG_SIMILARITY_THRESHOLD,
        "topK": settings.TOP_K,
        "faiss": {
            "basePath": str(settings.FAISS_BASE_PATH),
            "status": "active"
        }
    }

@app.get("/ai/diagnostic")
async def ai_diagnostic_endpoint():
    diagnostic = await llm_service.get_diagnostic()
    return {"success": True, "data": diagnostic}

@app.get("/user-stats/{user_id}")
async def get_user_stats(user_id: str):
    stats = faiss_service.get_user_stats(user_id)
    return {"success": True, "data": stats}

@app.post("/extract-pdf")
async def extract_pdf_endpoint(payload: ExtractPdfRequest):
    try:
        file_path = payload.filePath
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="PDF file does not exist in storage.")
        
        pages = []
        total_chars = 0
        total_words = 0
        page_count = 0
        
        # 1. Primary extraction with pypdf
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            page_count = len(reader.pages)
            for idx, p in enumerate(reader.pages):
                txt = p.extract_text() or ""
                cleaned = " ".join(txt.split())
                if cleaned:
                    pages.append({"page": idx + 1, "text": cleaned})
                    total_chars += len(cleaned)
                    total_words += len(cleaned.split())
        except RateLimitError:
            raise
        except Exception as e:
            logger.warning(f"[INGESTION] pypdf extraction warning: {e}")
        
        logger.info(f"[INGESTION] file = {file_path} pages = {page_count} extracted_chars = {total_chars}")
        
        # 2. OCR Fallback if 0 extracted characters and scanned/image PDF
        if total_chars == 0 and page_count > 0:
            logger.info(f"[INGESTION] Extracted 0 chars from text parser. Attempting OCR fallback for scanned PDF: {file_path}")
            try:
                import easyocr
                from PIL import Image
                import io
                import numpy as np
                reader_ocr = easyocr.Reader(['en'], gpu=False)
                pypdf_reader = pypdf.PdfReader(file_path)
                for idx, p in enumerate(pypdf_reader.pages):
                    page_images = p.images
                    page_text_parts = []
                    for img_obj in page_images:
                        img = Image.open(io.BytesIO(img_obj.data))
                        ocr_res = reader_ocr.readtext(np.array(img), detail=0)
                        if ocr_res:
                            page_text_parts.append(" ".join(ocr_res))
                    if page_text_parts:
                        p_text = " ".join(page_text_parts)
                        pages.append({"page": idx + 1, "text": p_text})
                        total_chars += len(p_text)
                        total_words += len(p_text.split())
            except Exception as ocr_err:
                logger.warning(f"[INGESTION] OCR fallback failed or unavailable: {ocr_err}")

        return {
            "success": True,
            "items": pages,
            "metadata": {
                "pageCount": max(page_count, len(pages), 1),
                "wordCount": total_words,
                "charCount": total_chars
            }
        }
    except HTTPException:
        raise
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"[INGESTION] Error extracting PDF {payload.filePath}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract PDF: {str(e)}"
        )

_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

@app.post("/extract-image")
async def extract_image_endpoint(payload: ExtractImageRequest):
    try:
        file_path = payload.filePath
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Image file does not exist in storage.")

        from PIL import Image
        import numpy as np

        try:
            with Image.open(file_path) as img:
                img.verify()
            img = Image.open(file_path).convert("RGB")
        except Exception as img_err:
            raise HTTPException(status_code=400, detail=f"Invalid or unreadable image file: {str(img_err)}")

        reader = get_ocr_reader()
        ocr_results = reader.readtext(np.array(img), detail=0)

        extracted_text = " ".join(ocr_results).strip()
        words = extracted_text.split()

        logger.info(f"[OCR] Extracted {len(extracted_text)} chars ({len(words)} words) from image: {file_path}")

        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Image contains no readable text. Please upload an image with clearer or larger text."
            )

        return {
            "success": True,
            "items": [{"page": 1, "text": extracted_text}],
            "metadata": {
                "pageCount": 1,
                "wordCount": len(words),
                "charCount": len(extracted_text)
            }
        }
    except HTTPException:
        raise
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"[INGESTION] OCR error extracting image {payload.filePath}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract image via OCR: {str(e)}"
        )

@app.post("/youtube/transcript")
async def youtube_transcript_endpoint(payload: YouTubeTranscriptRequest):
    try:
        languages = [str(lang).strip()[:10] for lang in (payload.languages or [])[:5] if str(lang).strip()]
        result = await fetch_transcript(payload.videoId, languages)
        return {"success": True, "data": result}
    except TranscriptError as e:
        logger.warning(f"[YOUTUBE] Transcript failed | video={payload.videoId} | code={e.code} | {e.message}")
        raise HTTPException(status_code=e.http_status, detail={"code": e.code, "message": e.message})

@app.post("/embeddings")
async def create_embeddings(payload: EmbeddingsRequest):
    try:
        embeddings = await embedding_service.get_embeddings(payload.texts)
        return {"success": True, "embeddings": embeddings}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}"
        )

@app.get("/index")
@app.get("/reindex")
async def get_index_info():
    return {
        "status": "ok",
        "service": "prepmind-ai-service",
        "endpoint": "/index",
        "method": "POST",
        "message": "Use POST to index or re-index knowledge source chunks."
    }

@app.post("/index")
@app.post("/reindex")
async def index_source(payload: IndexSourceRequest):
    try:
        logger.info(f"[INGESTION] Indexing source {payload.knowledgeSourceId} for user {payload.userId[:8]}... with {len(payload.chunks)} chunks")
        if not payload.chunks:
            return {"success": True, "indexedCount": 0}

        texts = [c.text for c in payload.chunks]
        embeddings: List[List[float]] = []
        # Embed in batches so a cancellation stops work at the next batch boundary.
        # FAISS is only written after every batch succeeds, so a cancelled job changes nothing.
        for start in range(0, len(texts), INDEX_BATCH_SIZE):
            if payload.jobId and payload.jobId in cancelled_jobs:
                logger.info(f"[INGESTION] Job {payload.jobId} cancelled after {start} of {len(texts)} chunks")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"code": "CANCELLED", "message": "Indexing was cancelled."},
                )
            embeddings.extend(await embedding_service.get_embeddings(texts[start:start + INDEX_BATCH_SIZE]))
        if payload.jobId and payload.jobId in cancelled_jobs:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "CANCELLED", "message": "Indexing was cancelled."},
            )

        chunks_data = [
            {
                "id": c.id,
                "chunkIndex": c.chunkIndex,
                "metadata": c.metadata or {}
            }
            for c in payload.chunks
        ]
        
        indexed_count = faiss_service.index_source_chunks(
            user_id=payload.userId,
            knowledge_source_id=payload.knowledgeSourceId,
            chunks=chunks_data,
            embeddings=embeddings
        )
        logger.info(f"[INGESTION] FAISS index updated: {indexed_count} vectors inserted")
        return {"success": True, "indexedCount": indexed_count}
    except HTTPException:
        raise
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"[INGESTION] Failed to index source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FAISS indexing failed: {str(e)}"
        )

@app.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    if len(job_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    cancelled_jobs.add(job_id)
    # Bound memory: job IDs are unique per run, old ones are no longer needed
    if len(cancelled_jobs) > 1000:
        cancelled_jobs.clear()
        cancelled_jobs.add(job_id)
    return {"success": True, "jobId": job_id, "cancelled": True}

@app.post("/classify/educational")
async def classify_educational_endpoint(payload: ClassifyContentRequest):
    try:
        result = await classify_educational_content(payload.text, payload.title, payload.wordCount)
        return {"success": True, "data": result}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"[CLASSIFY] Classification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Content classification failed: {str(e)}",
        )

@app.post("/search")
async def search_vectors(payload: SearchRequest):
    try:
        logger.info(f"[RAG] Query received: '{payload.query}' for user {payload.userId[:8]}...")
        q_emb = await embedding_service.get_embedding(payload.query)
        logger.info(f"[RAG] Query embedding generated (dim={len(q_emb)})")
        matches = faiss_service.search(
            user_id=payload.userId,
            query_vector=q_emb,
            top_k=payload.topK or settings.TOP_K,
            knowledge_source_ids=payload.knowledgeSourceIds,
            min_similarity=payload.minSimilarity
        )
        logger.info(f"[RAG] FAISS search completed: {len(matches)} matches found")
        return {"success": True, "matches": matches}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"[RAG] Vector search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}"
        )

@app.post("/delete-source")
async def delete_source(payload: DeleteSourceRequest):
    try:
        removed = faiss_service.delete_source_vectors(payload.userId, payload.knowledgeSourceId)
        return {"success": True, "removedCount": removed}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error deleting vectors for source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete source vectors: {str(e)}"
        )

@app.post("/rag/ask")
async def rag_ask(payload: AskRequest):
    try:
        result = await rag_service.ask(
            query=payload.query,
            chunks=payload.chunks,
            conversation_history=payload.conversationHistory
        )
        return {"success": True, "data": result}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG ask: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(e)}"
        )

@app.post("/rag/summary")
async def rag_summary(payload: SummaryRequest):
    try:
        result = await rag_service.generate_summary(
            chunks=payload.chunks,
            title=payload.title
        )
        return {"success": True, "data": result}
    except ValueError as e:
        # Empty source or unusable model output: not retryable as-is
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI summary failed: {str(e)}"
        )

@app.post("/rag/notes")
async def rag_notes(payload: NotesRequest):
    try:
        result = await rag_service.generate_notes(
            chunks=payload.chunks,
            title=payload.title
        )
        return {"success": True, "data": result}
    except ValueError as e:
        # Empty source or unusable model output: not retryable as-is
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG notes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI notes generation failed: {str(e)}"
        )

@app.post("/rag/quiz")
async def rag_quiz(payload: QuizRequest):
    try:
        result = await rag_service.generate_quiz(
            chunks=payload.chunks,
            title=payload.title,
            question_count=payload.questionCount or 5,
            difficulty=payload.difficulty or "Medium",
            question_type=payload.questionType or "MCQ",
            generation_id=payload.generationId,
            previous_question_texts=payload.previousQuestionTexts,
            retry=payload.retry,
        )
        return {"success": True, "data": result}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI quiz generation failed: {str(e)}"
        )

@app.post("/rag/practice-paper")
async def rag_practice_paper(payload: PracticePaperRequest):
    try:
        result = await rag_service.generate_practice_paper(
            chunks=payload.chunks,
            title=payload.title,
            total_marks=payload.totalMarks or 60,
            difficulty=payload.difficulty or "Medium"
        )
        return {"success": True, "data": result}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG practice paper: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI practice paper generation failed: {str(e)}"
        )

@app.post("/rag/viva")
async def rag_viva(payload: VivaRequest):
    try:
        result = await rag_service.generate_viva(
            chunks=payload.chunks,
            title=payload.title,
            question_count=payload.questionCount or 5,
            difficulty=payload.difficulty or "Medium"
        )
        return {"success": True, "data": result}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG viva generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI viva generation failed: {str(e)}"
        )

@app.post("/rag/evaluate")
async def rag_evaluate(payload: EvaluateRequest):
    try:
        result = await rag_service.evaluate_answer(
            question=payload.question,
            expected_answer=payload.expectedAnswer,
            user_answer=payload.userAnswer,
            rubric=payload.rubric,
            max_marks=payload.maxMarks or 5
        )
        return {"success": True, "data": result}
    except RateLimitError:
        raise
    except Exception as e:
        logger.error(f"Error in RAG answer evaluation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    logger.info("[AI SERVICE] Starting FastAPI service on http://0.0.0.0:%s", settings.AI_SERVICE_PORT)
    uvicorn.run(app, host="0.0.0.0", port=settings.AI_SERVICE_PORT)

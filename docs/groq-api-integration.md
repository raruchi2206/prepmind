# PrepMind AI Service: Mandatory Groq API Integration

## Overview

PrepMind uses the **Groq API** as the required, primary text-generation engine for all AI-generated features across the platform.

Text generation through Ollama has been replaced with Groq. Groq is not an optional provider, and there is no runtime selection switch between Ollama and Groq for text generation.

---

## 1. Scope of Groq Text Generation

The Groq API powers all LLM text generation features:
- **Summaries**: `/api/rag/summary` and `/api/rag/generate/summary`
- **Study Notes**: `/api/rag/notes` and `/api/rag/generate/notes`
- **Assessment Quizzes**:
  - Multiple Choice Questions (MCQ with 4 distinct options)
  - True/False Questions
  - Mixed Question Sets
- **Practice Question Papers**: Multi-section examination papers with marking schemes and rubrics
- **Oral Viva Examinations**: Structured conceptual viva questions and model answers
- **Viva Answer Evaluation**: Objective grading against rubrics with marks and constructive feedback
- **Ask PrepMind (RAG Q&A)**: Grounded question answering with source citations

---

## 2. Separation of Embeddings and Vector Retrieval

Embeddings and vector retrieval are kept strictly separate from Groq text generation:
- **Local Embedding Engine**: Uses local embedding models (such as `all-minilm`, 384 dimensions) via local embedding service.
- **Vector Database**: FAISS (IndexFlatIP) performs exact cosine similarity search over normalized vectors.
- **Grounding Pipeline**: Only the top-K relevant chunks retrieved from FAISS are passed to Groq as factual context.
- **Speed Optimizations**:
  - Sub-batched chunk embedding generation (32-chunk batches).
  - Incremental FAISS indexing (only updates modified knowledge sources).
  - Result caching for deterministic generation when `regenerate: false`.
  - Context truncation protections to stay well within model limits.

---

## 3. Environment Configuration

### Backend (`backend/.env`)
```bash
# Groq API Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### AI Service (`ai-service/.env`)
```bash
# Groq API Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Local Embeddings & FAISS
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=all-minilm
FAISS_BASE_PATH=./data/faiss
AI_SERVICE_PORT=8000
TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.20
```

> **Security Note**: Never commit real API keys into Git repositories or expose them to client browsers. The Groq API key is accessed exclusively by server-side processes.

---

## 4. Error Handling and Resilience

The Groq integration includes resilient error handling:
- **Rate Limits (`429`)**: Automatic exponential backoff with jitter up to 3 retries.
- **Timeouts**: Handled with configurable timeouts (`GROQ_TIMEOUT_SECONDS=60.0`) and retries.
- **Authentication Failures (`401`)**: Fails fast with clear user-facing error message without retrying invalid keys.
- **Context-Length Limits**: Returns actionable user feedback to reduce chunk or document size.
- **No Silent Fallback**: If Groq is unavailable, the application returns a clean error and preserves all user documents, chunks, and database records.

---

## 5. Health Check Endpoints

### AI Service Health (`GET http://127.0.0.1:8000/health`)
Returns:
```json
{
  "status": "ok",
  "service": "prepmind-ai-service",
  "textGenerationProvider": "groq",
  "groq": {
    "available": true,
    "provider": "groq",
    "active_llm": "llama-3.3-70b-versatile",
    "models": ["llama-3.3-70b-versatile", ...]
  },
  "embedding": {
    "available": true,
    "active_embedding": "all-minilm",
    "dimension": 384
  },
  "embeddingDimension": 384,
  "threshold": 0.2,
  "topK": 5,
  "faiss": {
    "basePath": "./data/faiss",
    "status": "active"
  }
}
```

### Backend AI Health (`GET http://localhost:5000/api/ai/health`)
Returns:
```json
{
  "success": true,
  "aiService": "connected",
  "groq": true,
  "provider": "groq",
  "llm": "llama-3.3-70b-versatile",
  "embedding": "all-minilm",
  "data": { ... }
}
```

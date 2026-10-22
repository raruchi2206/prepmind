import asyncio
import logging
import threading
from typing import List, Optional

import numpy as np
from config.settings import settings

logger = logging.getLogger("embedding_service")

EMBEDDING_DIMENSION = 384


class EmbeddingService:
    """Local all-MiniLM-L6-v2 embeddings (384-dim) via fastembed's ONNX runtime.

    Runs in-process on CPU without torch, so indexing no longer depends on Ollama. The
    model is loaded once and shared; encoding runs in a worker thread to keep the event
    loop free.
    """

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self._model = None
        self._load_error: Optional[str] = None
        self._lock = threading.Lock()

    def _load_model(self):
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is None:
                from fastembed import TextEmbedding

                logger.info(f"[EMBEDDING] Loading local model '{self.model_name}'")
                try:
                    settings.EMBEDDING_CACHE_DIR.mkdir(parents=True, exist_ok=True)
                    model = TextEmbedding(self.model_name, cache_dir=str(settings.EMBEDDING_CACHE_DIR))
                    dimension = len(next(iter(model.embed(["dimension probe"]))))
                except Exception as e:
                    self._load_error = str(e)
                    raise
                if dimension != EMBEDDING_DIMENSION:
                    raise RuntimeError(
                        f"Embedding model '{self.model_name}' produces {dimension}-dim vectors; "
                        f"the FAISS index expects {EMBEDDING_DIMENSION}."
                    )
                self._model = model
                self._load_error = None
                logger.info(f"[EMBEDDING] Model ready ({dimension}-dim)")
        return self._model

    async def warm_up(self) -> None:
        try:
            await asyncio.to_thread(self._load_model)
        except Exception as e:
            logger.error(f"[EMBEDDING] Failed to load model: {e}")

    async def get_active_model(self) -> str:
        return self.model_name

    async def check_health(self) -> bool:
        return self._model is not None

    def health_info(self) -> dict:
        return {
            "provider": "fastembed",
            "model": self.model_name,
            "dimension": EMBEDDING_DIMENSION,
            "loaded": self._model is not None,
            "error": self._load_error,
        }

    async def get_embedding(self, text: str) -> List[float]:
        """Generate normalized embedding for a single text."""
        embeddings = await self.get_embeddings([text])
        return embeddings[0]

    def _encode(self, texts: List[str]) -> List[List[float]]:
        model = self._load_model()
        vectors = np.asarray(
            list(model.embed(texts, batch_size=settings.EMBEDDING_BATCH_SIZE)),
            dtype=np.float32,
        )
        # Re-normalize defensively so FAISS inner product equals cosine similarity
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (vectors / norms).tolist()

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate L2-normalized embeddings for a list of texts."""
        if not texts:
            return []
        logger.info(f"[EMBEDDING] Encoding {len(texts)} chunks with '{self.model_name}'")
        try:
            return await asyncio.to_thread(self._encode, texts)
        except Exception as e:
            raise RuntimeError(f"Local embedding model failed: {e}") from e


embedding_service = EmbeddingService()

import logging
from typing import List, Optional
import httpx
import numpy as np
from config.settings import settings

logger = logging.getLogger("embedding_service")

class EmbeddingService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self._preferred_model = settings.OLLAMA_EMBEDDING_MODEL
        self._fallback_model = settings.OLLAMA_EMBEDDING_MODEL
        self._resolved_model: Optional[str] = None

    async def get_active_model(self) -> str:
        if self._resolved_model:
            return self._resolved_model
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    for m in models:
                        if self._preferred_model in m:
                            self._resolved_model = m
                            return m
                    if models:
                        self._resolved_model = models[0]
                        return self._resolved_model
        except Exception as e:
            logger.warning(f"[EMBEDDING] Could not query local embedding tags: {e}")
        self._resolved_model = self._fallback_model
        return self._resolved_model

    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception as e:
            logger.error(f"[EMBEDDING] Health check failed: {e}")
            return False

    async def get_embedding(self, text: str) -> List[float]:
        """Generate normalized embedding for a single text."""
        embeddings = await self.get_embeddings([text])
        return embeddings[0]

    async def get_embeddings(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Generate normalized embeddings for a list of texts with batched chunking."""
        if not texts:
            return []

        model = await self.get_active_model()
        logger.info(f"[EMBEDDING] Generating embeddings using local model '{model}' for {len(texts)} chunks")

        all_raw_embeddings: List[List[float]] = []

        async with httpx.AsyncClient(timeout=120.0) as client:
            for start_idx in range(0, len(texts), batch_size):
                batch = texts[start_idx : start_idx + batch_size]
                batch_embeddings: Optional[List[List[float]]] = None

                # 1. Primary: Fast batched /api/embed
                try:
                    res = await client.post(
                        f"{self.base_url}/api/embed",
                        json={"model": model, "input": batch}
                    )
                    if res.status_code == 200:
                        data = res.json()
                        raw_emb = data.get("embeddings", [])
                        if len(raw_emb) == len(batch):
                            batch_embeddings = raw_emb
                except Exception as e:
                    logger.debug(f"[EMBEDDING] /api/embed batch failed: {e}, falling back to single chunk calls")

                # 2. Fallback: Sequential /api/embeddings per item in batch
                if batch_embeddings is None:
                    batch_embeddings = []
                    for text in batch:
                        res = await client.post(
                            f"{self.base_url}/api/embeddings",
                            json={"model": model, "prompt": text}
                        )
                        if res.status_code != 200:
                            raise RuntimeError(f"Local embedding failed with status {res.status_code}: {res.text}")
                        data = res.json()
                        batch_embeddings.append(data["embedding"])

                all_raw_embeddings.extend(batch_embeddings)

        return self._normalize_batch(all_raw_embeddings)

    def _normalize_batch(self, vectors: List[List[float]]) -> List[List[float]]:
        arr = np.array(vectors, dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = arr / norms
        return normalized.tolist()

embedding_service = EmbeddingService()

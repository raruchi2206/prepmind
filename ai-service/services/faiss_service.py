import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional
import faiss
import numpy as np
from config.settings import settings

logger = logging.getLogger("faiss_service")

class FAISSService:
    def __init__(self):
        self.base_path = Path(settings.FAISS_BASE_PATH)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_user_dir(self, user_id: str) -> Path:
        user_dir = self.base_path / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    def _get_index_path(self, user_id: str) -> Path:
        return self._get_user_dir(user_id) / "index.faiss"

    def _get_metadata_path(self, user_id: str) -> Path:
        return self._get_user_dir(user_id) / "metadata.json"

    def _load_metadata(self, user_id: str) -> List[Dict[str, Any]]:
        meta_path = self._get_metadata_path(user_id)
        if not meta_path.exists():
            return []
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"[FAISS] Failed to read metadata for user {user_id}: {e}")
            return []

    def _save_metadata(self, user_id: str, metadata: List[Dict[str, Any]]):
        meta_path = self._get_metadata_path(user_id)
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    def _load_index(self, user_id: str) -> Optional[faiss.Index]:
        index_path = self._get_index_path(user_id)
        if not index_path.exists():
            return None
        try:
            return faiss.read_index(str(index_path))
        except Exception as e:
            logger.error(f"[FAISS] Failed to read index for user {user_id}: {e}")
            return None

    def _save_index(self, user_id: str, index: faiss.Index):
        index_path = self._get_index_path(user_id)
        faiss.write_index(index, str(index_path))

    def index_source_chunks(
        self,
        user_id: str,
        knowledge_source_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> int:
        """
        Index or re-index chunks for a knowledge source under a specific user.
        Rebuilding ensures no duplicates if reprocessed.
        """
        if not chunks or not embeddings:
            return 0

        user_id = str(user_id)
        knowledge_source_id = str(knowledge_source_id)

        # 1. Existing metadata & index
        old_metadata = self._load_metadata(user_id)
        old_index = self._load_index(user_id)

        # Separate items not matching this knowledge source
        retained_metadata = []
        retained_vectors = []

        if old_index is not None and old_metadata:
            for i, meta in enumerate(old_metadata):
                if str(meta.get("knowledgeSourceId")) != knowledge_source_id:
                    retained_metadata.append(meta)
                    # reconstruct vector from index if supported
                    try:
                        vec = old_index.reconstruct(i)
                        retained_vectors.append(vec)
                    except Exception:
                        pass

        # 2. Build new batch
        new_vectors = np.array(embeddings, dtype=np.float32)
        dimension = new_vectors.shape[1]

        # 3. Combine retained and new vectors
        if retained_vectors:
            retained_arr = np.array(retained_vectors, dtype=np.float32)
            all_vectors = np.vstack([retained_arr, new_vectors])
        else:
            all_vectors = new_vectors

        # 4. Create fresh IndexFlatIP for exact cosine similarity (embeddings already normalized)
        fresh_index = faiss.IndexFlatIP(dimension)
        fresh_index.add(all_vectors)

        # 5. Build combined metadata
        new_meta_entries = []
        for chunk in chunks:
            new_meta_entries.append({
                "chunkId": str(chunk.get("id") or chunk.get("_id")),
                "knowledgeSourceId": knowledge_source_id,
                "userId": user_id,
                "chunkIndex": chunk.get("chunkIndex", 0),
                "metadata": chunk.get("metadata", {})
            })

        combined_metadata = retained_metadata + new_meta_entries

        # 6. Persist to disk
        self._save_index(user_id, fresh_index)
        self._save_metadata(user_id, combined_metadata)

        logger.info(f"[FAISS] Indexed {len(new_meta_entries)} chunks for source {knowledge_source_id} under user {user_id}. Total vectors: {fresh_index.ntotal}")
        return len(new_meta_entries)

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for a user's FAISS index."""
        user_id = str(user_id)
        index = self._load_index(user_id)
        metadata = self._load_metadata(user_id)
        exists = index is not None and self._get_index_path(user_id).exists()
        dimension = index.d if index is not None else 0
        vector_count = index.ntotal if index is not None else 0
        meta_count = len(metadata)

        logger.info(
            f"[FAISS] User: {user_id[:8]}... | Index exists: {exists} | Index dimension: {dimension} | Vector count: {vector_count} | Metadata count: {meta_count}"
        )
        return {
            "exists": exists,
            "dimension": dimension,
            "vectorCount": vector_count,
            "metadataCount": meta_count
        }

    def search(
        self,
        user_id: str,
        query_vector: List[float],
        top_k: int = 5,
        knowledge_source_ids: Optional[List[str]] = None,
        min_similarity: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for top-K matching chunks strictly isolated to user_id,
        optionally filtered by knowledge_source_ids and minimum similarity threshold.
        """
        user_id = str(user_id)
        index = self._load_index(user_id)
        metadata = self._load_metadata(user_id)

        threshold = min_similarity if min_similarity is not None else settings.RAG_SIMILARITY_THRESHOLD

        if index is None or not metadata or index.ntotal == 0:
            logger.info(f"[FAISS] Search: No index or vectors found for user {user_id[:8]}...")
            return []

        q_dim = len(query_vector)
        if index.d != q_dim:
            logger.error(f"[EMBEDDING] Dimension mismatch: Query dimension ({q_dim}) != Index dimension ({index.d})")
            raise ValueError(f"Query vector dimension ({q_dim}) does not match index dimension ({index.d})")

        logger.info(
            f"[RAG] Query vector dimension: {q_dim} | FAISS index dimension: {index.d} | FAISS vectors available: {index.ntotal}"
        )

        # Target KS filter set
        allowed_ks = set(str(k) for k in knowledge_source_ids) if knowledge_source_ids else None

        q_vec = np.array([query_vector], dtype=np.float32)
        fetch_k = min(index.ntotal, max(top_k * 4, 20))
        scores, indices = index.search(q_vec, fetch_k)

        results = []
        candidates_count = len(scores[0]) if len(scores) > 0 else 0

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(metadata):
                continue
            meta = metadata[idx]

            # Verify ownership
            if str(meta.get("userId")) != user_id:
                continue

            # Check source filter if provided
            if allowed_ks and str(meta.get("knowledgeSourceId")) not in allowed_ks:
                continue

            similarity = float(score)
            logger.info(f"[FAISS] Candidate chunkId={meta.get('chunkId')} similarity={similarity:.4f} vs threshold={threshold:.4f}")
            # Apply threshold
            if similarity < threshold:
                continue

            results.append({
                "chunkId": meta.get("chunkId"),
                "knowledgeSourceId": meta.get("knowledgeSourceId"),
                "score": similarity,
                "metadata": meta.get("metadata", {}),
                "chunkIndex": meta.get("chunkIndex", 0)
            })

            if len(results) >= top_k:
                break

        logger.info(
            f"[RAG] FAISS search candidates: {candidates_count} | Relevant chunks after threshold ({threshold}): {len(results)}"
        )
        return results

    def delete_source_vectors(self, user_id: str, knowledge_source_id: str) -> int:
        """
        Remove all vectors associated with a specific knowledge source for a user.
        """
        user_id = str(user_id)
        knowledge_source_id = str(knowledge_source_id)

        old_metadata = self._load_metadata(user_id)
        old_index = self._load_index(user_id)

        if old_index is None or not old_metadata:
            return 0

        retained_metadata = []
        retained_vectors = []
        removed_count = 0

        for i, meta in enumerate(old_metadata):
            is_match = (knowledge_source_id == "all") or (str(meta.get("knowledgeSourceId")) == knowledge_source_id)
            if not is_match:
                retained_metadata.append(meta)
                try:
                    retained_vectors.append(old_index.reconstruct(i))
                except Exception:
                    pass
            else:
                removed_count += 1

        if not retained_metadata or not retained_vectors:
            # Clean up files if empty
            index_path = self._get_index_path(user_id)
            meta_path = self._get_metadata_path(user_id)
            if index_path.exists():
                index_path.unlink()
            if meta_path.exists():
                meta_path.unlink()
            logger.info(f"[FAISS] Removed all {removed_count} vectors for source {knowledge_source_id}. Index is now empty.")
            return removed_count

        # Rebuild index
        arr = np.array(retained_vectors, dtype=np.float32)
        fresh_index = faiss.IndexFlatIP(arr.shape[1])
        fresh_index.add(arr)

        self._save_index(user_id, fresh_index)
        self._save_metadata(user_id, retained_metadata)
        logger.info(f"[FAISS] Removed {removed_count} vectors for source {knowledge_source_id}. Remaining: {fresh_index.ntotal}")
        return removed_count

    def delete_user(self, user_id: str):
        """Remove all indices and metadata for a user."""
        user_dir = self._get_user_dir(str(user_id))
        if user_dir.exists():
            shutil.rmtree(user_dir)
            logger.info(f"[FAISS] Deleted all index data for user {user_id}")

faiss_service = FAISSService()

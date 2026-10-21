import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    OLLAMA_LLM_MODEL: str = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5vl:3b")
    OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "all-minilm")
    FAISS_BASE_PATH: Path = Path(os.getenv("FAISS_BASE_PATH", "./data/faiss")).resolve()
    AI_SERVICE_PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    TOP_K: int = int(os.getenv("TOP_K", "5"))
    RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.20"))

settings = Settings()

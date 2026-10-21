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
    YOUTUBE_TRANSCRIPT_TIMEOUT_SECONDS: float = float(os.getenv("YOUTUBE_TRANSCRIPT_TIMEOUT_SECONDS", "45"))
    YOUTUBE_MAX_TRANSCRIPT_WORDS: int = int(os.getenv("YOUTUBE_MAX_TRANSCRIPT_WORDS", "150000"))
    # Optional proxies for servers whose IP YouTube blocks (e.g. cloud hosts)
    YOUTUBE_WEBSHARE_PROXY_USERNAME: str = os.getenv("YOUTUBE_WEBSHARE_PROXY_USERNAME", "")
    YOUTUBE_WEBSHARE_PROXY_PASSWORD: str = os.getenv("YOUTUBE_WEBSHARE_PROXY_PASSWORD", "")
    YOUTUBE_PROXY_HTTP_URL: str = os.getenv("YOUTUBE_PROXY_HTTP_URL", "")
    YOUTUBE_PROXY_HTTPS_URL: str = os.getenv("YOUTUBE_PROXY_HTTPS_URL", "")

settings = Settings()

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class Settings:
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    OLLAMA_LLM_MODEL: str = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5vl:3b")
    OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "all-minilm")
    # Local all-MiniLM-L6-v2 embeddings via fastembed (384-dim, matches the FAISS index)
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    EMBEDDING_CACHE_DIR: Path = Path(
        os.getenv("EMBEDDING_CACHE_DIR", str(Path(__file__).resolve().parent.parent / "data" / "models"))
    ).resolve()
    EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "64"))
    # Groq LLM (used instead of Ollama for generation when GROQ_API_KEY is set)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GROQ_REASONING_EFFORT: str = os.getenv("GROQ_REASONING_EFFORT", "low")
    GROQ_REASONING_TOKEN_BUDGET: int = int(os.getenv("GROQ_REASONING_TOKEN_BUDGET", "1024"))
    GROQ_TIMEOUT_SECONDS: float = float(os.getenv("GROQ_TIMEOUT_SECONDS", "120"))
    GROQ_MAX_RETRIES: int = int(os.getenv("GROQ_MAX_RETRIES", "3"))
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

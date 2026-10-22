import os
from pathlib import Path
from dotenv import dotenv_values, load_dotenv

_current_dir = Path(__file__).resolve().parent
_ai_service_dir = _current_dir.parent
_workspace_dir = _ai_service_dir.parent
_backend_dir = _workspace_dir / "backend"

# Search and load non-empty values from backend/.env, ai-service/.env, workspace/.env
_combined_env = {}
for env_path in [
    _workspace_dir / ".env",
    _ai_service_dir / ".env",
    _backend_dir / ".env",
]:
    if env_path.exists():
        vals = dotenv_values(str(env_path))
        for k, v in vals.items():
            if v is not None and str(v).strip():
                _combined_env[k] = str(v).strip()
        load_dotenv(dotenv_path=env_path, override=True)

# Also sync combined into os.environ for non-empty values
for k, v in _combined_env.items():
    if v and not os.environ.get(k):
        os.environ[k] = v


class Settings:
    # Provider Selection (Hybrid Architecture)
    AI_PRIMARY_PROVIDER: str = os.getenv("AI_PRIMARY_PROVIDER", _combined_env.get("AI_PRIMARY_PROVIDER", "groq")).lower()
    AI_FALLBACK_PROVIDER: str = os.getenv("AI_FALLBACK_PROVIDER", _combined_env.get("AI_FALLBACK_PROVIDER", "ollama")).lower()

    # Groq API Configuration (Primary text-generation engine)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", _combined_env.get("GROQ_API_KEY", "")).strip()
    GROQ_MODEL: str = os.getenv(
        "GROQ_MODEL", _combined_env.get("GROQ_MODEL", "openai/gpt-oss-120b")
    ).strip()
    GROQ_BASE_URL: str = os.getenv(
        "GROQ_BASE_URL", _combined_env.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    ).rstrip("/")
    GROQ_TIMEOUT_SECONDS: float = float(os.getenv("GROQ_TIMEOUT_SECONDS", "45.0"))
    GROQ_MAX_RETRIES: int = int(os.getenv("GROQ_MAX_RETRIES", "2"))

    # Ollama Configuration (Automatic fallback text generation & local embeddings)
    OLLAMA_BASE_URL: str = os.getenv(
        "OLLAMA_BASE_URL", _combined_env.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ).rstrip("/")
    OLLAMA_LLM_MODEL: str = os.getenv(
        "OLLAMA_LLM_MODEL", _combined_env.get("OLLAMA_LLM_MODEL", "qwen2.5vl:3b")
    ).strip()
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", _combined_env.get("EMBEDDING_PROVIDER", "ollama")).lower()
    OLLAMA_EMBEDDING_MODEL: str = os.getenv(
        "OLLAMA_EMBEDDING_MODEL", _combined_env.get("OLLAMA_EMBEDDING_MODEL", "all-minilm:latest")
    ).strip()
    FAISS_BASE_PATH: Path = Path(os.getenv("FAISS_BASE_PATH", "./data/faiss")).resolve()

    # AI Service API Configuration
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

    @classmethod
    def get_groq_key(cls) -> str:
        """Dynamically fetch the Groq key from memory or backend/.env if changed."""
        key = os.getenv("GROQ_API_KEY", "").strip()
        if key:
            return key
        if (_backend_dir / ".env").exists():
            backend_vals = dotenv_values(str(_backend_dir / ".env"))
            key = (backend_vals.get("GROQ_API_KEY") or "").strip()
            if key:
                os.environ["GROQ_API_KEY"] = key
                cls.GROQ_API_KEY = key
                return key
        return cls.GROQ_API_KEY


settings = Settings()

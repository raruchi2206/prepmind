import json
import logging
from typing import Any, Dict, List, Optional
import httpx
from config.settings import settings

logger = logging.getLogger("llm_service")

class LLMService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_LLM_MODEL

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    return {
                        "available": True,
                        "models": models,
                        "active_llm": self.model,
                        "active_embedding": settings.OLLAMA_EMBEDDING_MODEL
                    }
                return {"available": False, "error": f"Status {res.status_code}"}
        except Exception as e:
            return {"available": False, "error": str(e)}

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        format_json: bool = False,
        format_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        debug_label: Optional[str] = None,
        seed: Optional[int] = None,
    ) -> str:
        """Call Ollama LLM with grounding and safety instructions."""
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": max(4096, min(16384, max_tokens + 4096))
            }
        }
        if system:
            payload["system"] = system
        if seed is not None:
            payload["options"]["seed"] = seed
        if format_schema is not None or format_json:
            payload["format"] = "json"


        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Ollama generation failed ({res.status_code}): {res.text}")
                data = res.json()
                if debug_label:
                    logger.info(
                        "[%s DEBUG] Ollama done_reason=%s eval_count=%s",
                        debug_label,
                        data.get("done_reason", "unknown"),
                        data.get("eval_count", "unknown"),
                    )

                # Safely extract text from all standard Ollama response shapes:
                # 1) {"response": "..."} (standard /api/generate)
                # 2) {"message": {"content": "..."}} (standard /api/chat or wrapped)
                # 3) {"content": "..."}
                # 4) {"text": "..."}
                raw_text = ""
                if isinstance(data, dict):
                    if "response" in data and isinstance(data["response"], str):
                        raw_text = data["response"]
                    elif "message" in data and isinstance(data["message"], dict):
                        raw_text = data["message"].get("content", "")
                    elif "content" in data and isinstance(data["content"], str):
                        raw_text = data["content"]
                    elif "text" in data and isinstance(data["text"], str):
                        raw_text = data["text"]
                    else:
                        raw_text = str(data.get("response") or data.get("content") or "")
                elif isinstance(data, str):
                    raw_text = data

                return raw_text.strip()
            except Exception as e:
                logger.exception("[LLM] Error calling Ollama")
                detail = str(e) or "request ended without a response detail"
                raise RuntimeError(f"Ollama request failed ({type(e).__name__}): {detail}") from e

llm_service = LLMService()

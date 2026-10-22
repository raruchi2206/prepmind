import asyncio
import logging
from typing import Any, Dict, List, Optional
import httpx
from config.settings import settings

logger = logging.getLogger("llm_service")

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class LLMService:
    """Text generation via Groq (when GROQ_API_KEY is set) or a local Ollama server."""

    def __init__(self):
        self.provider = "groq" if settings.GROQ_API_KEY else "ollama"
        self.model = settings.GROQ_MODEL if self.provider == "groq" else settings.OLLAMA_LLM_MODEL
        self.base_url = settings.OLLAMA_BASE_URL

    @property
    def masked_api_key(self) -> str:
        key = settings.GROQ_API_KEY or ""
        return f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("set" if key else "not set")

    async def check_health(self) -> Dict[str, Any]:
        from services.embedding_service import embedding_service

        embedding = embedding_service.health_info()
        if self.provider == "groq":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    )
                if res.status_code == 200:
                    models = [m.get("id") for m in res.json().get("data", [])]
                    return {
                        "available": self.model in models,
                        "provider": "groq",
                        "active_llm": self.model,
                        "active_embedding": embedding["model"],
                        "embedding": embedding,
                        **({} if self.model in models else {"error": f"Model '{self.model}' is not available on Groq"}),
                    }
                return {"available": False, "provider": "groq", "error": f"Groq returned status {res.status_code}"}
            except Exception as e:
                return {"available": False, "provider": "groq", "error": str(e)}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
            if res.status_code == 200:
                models = [m.get("name") for m in res.json().get("models", [])]
                return {
                    "available": True,
                    "provider": "ollama",
                    "models": models,
                    "active_llm": self.model,
                    "active_embedding": embedding["model"],
                    "embedding": embedding,
                }
            return {"available": False, "provider": "ollama", "error": f"Status {res.status_code}"}
        except Exception as e:
            return {"available": False, "provider": "ollama", "error": str(e)}

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
        """Generate text with grounding and safety instructions in the system prompt."""
        want_json = format_schema is not None or format_json
        if self.provider == "groq":
            return await self._generate_groq(prompt, system, want_json, temperature, max_tokens, debug_label, seed)
        return await self._generate_ollama(prompt, system, want_json, temperature, max_tokens, debug_label, seed)

    async def _generate_groq(self, prompt, system, want_json, temperature, max_tokens, debug_label, seed) -> str:
        messages: List[Dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            # Reasoning models spend part of the budget thinking before answering
            "max_completion_tokens": max_tokens + settings.GROQ_REASONING_TOKEN_BUDGET,
        }
        if settings.GROQ_REASONING_EFFORT:
            payload["reasoning_effort"] = settings.GROQ_REASONING_EFFORT
            payload["include_reasoning"] = False
        if seed is not None:
            payload["seed"] = seed
        if want_json:
            payload["response_format"] = {"type": "json_object"}

        headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
        last_error = ""
        async with httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT_SECONDS) as client:
            for attempt in range(1, settings.GROQ_MAX_RETRIES + 2):
                try:
                    res = await client.post(GROQ_CHAT_URL, json=payload, headers=headers)
                except httpx.HTTPError as e:
                    last_error = f"{type(e).__name__}: {e}"
                else:
                    if res.status_code == 200:
                        data = res.json()
                        choice = (data.get("choices") or [{}])[0]
                        if debug_label:
                            logger.info(
                                "[%s DEBUG] Groq finish_reason=%s usage=%s",
                                debug_label,
                                choice.get("finish_reason"),
                                data.get("usage"),
                            )
                        return ((choice.get("message") or {}).get("content") or "").strip()
                    last_error = f"status {res.status_code}: {res.text[:300]}"
                    if res.status_code not in RETRYABLE_STATUS:
                        break
                    retry_after = res.headers.get("retry-after")
                    if retry_after and retry_after.replace(".", "", 1).isdigit():
                        await asyncio.sleep(min(float(retry_after), 20.0))
                        continue
                if attempt <= settings.GROQ_MAX_RETRIES:
                    await asyncio.sleep(min(2 ** attempt, 10))

        logger.error(f"[LLM] Groq request failed: {last_error}")
        raise RuntimeError(f"Groq request failed ({last_error})")

    async def _generate_ollama(self, prompt, system, want_json, temperature, max_tokens, debug_label, seed) -> str:
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
        if want_json:
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

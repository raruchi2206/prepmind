import asyncio
import re
import time
import logging
from collections import deque
from typing import Any, Dict, List, Optional
import httpx
from config.settings import settings

logger = logging.getLogger("llm_service")

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
# Bound rate-limit wait: free tier Groq should not block for minutes
MAX_RATE_LIMIT_WAIT_SECONDS = 2.0
RATE_LIMIT_RETRIES = 1


class RateLimitError(RuntimeError):
    """Groq returned 429 rate limit and wait exceeds bounded threshold."""


def rate_limit_wait_seconds(response) -> float:
    header = response.headers.get("retry-after")
    try:
        if header:
            return float(header)
    except ValueError:
        pass
    match = re.search(r"try again in (?:(\d+)m)?([\d.]+)s", response.text or "")
    if match:
        return int(match.group(1) or 0) * 60 + float(match.group(2))
    return 5.0


class LLMService:
    """Hybrid text generation: Groq is primary, Ollama is automatic fallback."""

    def __init__(self):
        self.provider = "groq" if settings.GROQ_API_KEY else "ollama"
        self.primary_provider = "groq"
        self.fallback_provider = "ollama"
        self.model = settings.GROQ_MODEL
        self.ollama_model = settings.OLLAMA_LLM_MODEL
        self.base_url = settings.OLLAMA_BASE_URL

        # State tracking for diagnostics and telemetry
        self.last_successful_provider: Optional[str] = None
        self.last_groq_error: Optional[str] = None
        self.last_ollama_error: Optional[str] = None
        self.fallback_events: deque = deque(maxlen=50)
        self.stats: Dict[str, int] = {
            "total_requests": 0,
            "groq_successes": 0,
            "ollama_successes": 0,
            "groq_fallbacks": 0,
            "failures": 0,
        }

        # Circuit breaker / rate-limit window tracking for Groq
        self.groq_rate_limited_until: float = 0.0
        self.groq_rate_limit_reason: str = ""

        # Concurrency protection for local Ollama execution
        self._ollama_lock = asyncio.Lock()
        self._last_ollama_check_time: float = 0.0
        self._ollama_cached_status: Dict[str, Any] = {"available": False, "models": []}

    @property
    def masked_api_key(self) -> str:
        key = settings.GROQ_API_KEY or ""
        return f"{key[:4]}...{key[-4:]}" if len(key) > 8 else ("configured" if key else "missing")

    def is_groq_rate_limited(self) -> bool:
        """Returns True if Groq is currently in an active rate-limited window."""
        return time.time() < self.groq_rate_limited_until

    def record_fallback(self, from_provider: str, reason: str, endpoint: str = "generate"):
        event = {
            "timestamp": time.time(),
            "iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "fromProvider": from_provider,
            "toProvider": "ollama",
            "reason": str(reason)[:300],
            "endpoint": endpoint,
        }
        self.fallback_events.appendleft(event)
        self.stats["groq_fallbacks"] += 1
        logger.warning(f"[LLM FALLBACK] {from_provider} -> ollama | Reason: {reason}")

    async def validate_ollama(self) -> tuple[bool, str]:
        """Validates that local Ollama service is listening and the configured model is installed."""
        now = time.time()
        if now - self._last_ollama_check_time > 15.0 or not self._ollama_cached_status.get("available"):
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name", "") for m in res.json().get("models", [])]
                    self._ollama_cached_status = {"available": True, "models": models}
                    self._last_ollama_check_time = now
                else:
                    self._ollama_cached_status = {"available": False, "error": f"Ollama HTTP {res.status_code}"}
                    self._last_ollama_check_time = now
            except Exception as e:
                self._ollama_cached_status = {"available": False, "error": f"Ollama connection error: {e}"}
                self._last_ollama_check_time = now

        if not self._ollama_cached_status.get("available"):
            err = self._ollama_cached_status.get("error", "Ollama is not running")
            return False, f"Ollama service is unavailable at {self.base_url}: {err}"

        installed_models = self._ollama_cached_status.get("models", [])
        model_name = self.ollama_model
        has_model = any(model_name in m or m.startswith(model_name.split(":")[0]) for m in installed_models)
        if not has_model and installed_models:
            return False, f"Configured Ollama model '{model_name}' is not installed (available models: {', '.join(installed_models)})"

        return True, ""

    async def check_health(self) -> Dict[str, Any]:
        from services.embedding_service import embedding_service

        embedding = embedding_service.health_info()
        groq_status = {"available": False, "model": self.model}
        ollama_status = {"available": False, "model": self.ollama_model, "provider": "ollama"}

        # Check Groq connectivity
        if settings.GROQ_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    )
                if res.status_code == 200:
                    models = [m.get("id") for m in res.json().get("data", [])]
                    groq_status["available"] = self.model in models
                    groq_status["models_count"] = len(models)
                    if self.model not in models:
                        groq_status["error"] = f"Model '{self.model}' not in available Groq models"
                else:
                    groq_status["error"] = f"Groq status {res.status_code}"
            except Exception as e:
                groq_status["error"] = str(e)
        else:
            groq_status["error"] = "GROQ_API_KEY is not configured"

        # Check Ollama connectivity
        ok, reason = await self.validate_ollama()
        ollama_status["available"] = ok
        ollama_status["models"] = self._ollama_cached_status.get("models", [])
        if not ok:
            ollama_status["error"] = reason

        active = "groq" if (groq_status["available"] and not self.is_groq_rate_limited()) else ("ollama" if ollama_status["available"] else "none")

        return {
            "available": groq_status["available"] or ollama_status["available"],
            "status": "ok" if (groq_status["available"] or ollama_status["available"]) else "degraded",
            "primaryProvider": "groq",
            "fallbackProvider": "ollama",
            "activeProvider": active,
            "groq": groq_status,
            "ollama": ollama_status,
            "active_llm": self.model if active == "groq" else self.ollama_model,
            "active_embedding": embedding["model"],
            "embedding": embedding,
            "groqRateLimited": self.is_groq_rate_limited(),
        }

    async def get_diagnostic(self) -> Dict[str, Any]:
        """Provides full diagnostics without exposing secret credentials."""
        health = await self.check_health()
        return {
            "primaryProvider": self.primary_provider,
            "fallbackProvider": self.fallback_provider,
            "activeProvider": health.get("activeProvider", "none"),
            "lastSuccessfulProvider": self.last_successful_provider,
            "groq": {
                "configured": bool(settings.GROQ_API_KEY),
                "maskedApiKey": self.masked_api_key,
                "configuredModel": settings.GROQ_MODEL,
                "available": health.get("groq", {}).get("available", False),
                "lastError": self.last_groq_error,
                "rateLimitedUntil": self.groq_rate_limited_until,
                "timeoutSeconds": settings.GROQ_TIMEOUT_SECONDS,
                "maxRetries": settings.GROQ_MAX_RETRIES,
            },
            "ollama": {
                "baseUrl": self.base_url,
                "configuredModel": settings.OLLAMA_LLM_MODEL,
                "available": health.get("ollama", {}).get("available", False),
                "lastError": self.last_ollama_error,
            },
            "embedding": health.get("embedding", {}),
            "fallbackEvents": list(self.fallback_events),
            "stats": self.stats,
        }

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
        """
        Groq is the PRIMARY text-generation engine.
        Ollama is the AUTOMATIC FALLBACK if Groq fails, times out, rate limits, or returns empty output.
        """
        self.stats["total_requests"] += 1
        want_json = format_schema is not None or format_json

        groq_error: Optional[Exception] = None

        # 1. Try Groq first if configured AND not currently rate-limited
        if self.is_groq_rate_limited():
            remaining_wait = max(1.0, round(self.groq_rate_limited_until - time.time(), 1))
            logger.info(f"[LLM] Groq circuit breaker ACTIVE ({remaining_wait}s remaining); routing directly to Ollama")
            groq_error = RateLimitError(f"Groq rate limit active (retry in {remaining_wait}s): {self.groq_rate_limit_reason}")
            self.record_fallback("groq", f"Rate limit active ({remaining_wait}s remaining)", debug_label or "generate")
        elif settings.GROQ_API_KEY:
            try:
                res = await self._generate_groq(
                    prompt=prompt,
                    system=system,
                    want_json=want_json,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    debug_label=debug_label,
                    seed=seed,
                )
                if res and res.strip():
                    self.last_successful_provider = "groq"
                    self.last_groq_error = None
                    self.groq_rate_limited_until = 0.0
                    self.stats["groq_successes"] += 1
                    return res.strip()
                # Empty or whitespace response from Groq
                groq_error = RuntimeError("Groq returned empty or whitespace response")
            except Exception as e:
                groq_error = e
                self.last_groq_error = str(e)

            # Record fallback event
            self.record_fallback("groq", str(groq_error), debug_label or "generate")
        else:
            groq_error = RuntimeError("GROQ_API_KEY is not configured")
            self.record_fallback("groq", "GROQ_API_KEY is not configured", debug_label or "generate")

        # 2. Automatic fallback to Ollama
        logger.info(f"[LLM] Falling back to Ollama ({settings.OLLAMA_LLM_MODEL})")
        try:
            res = await self._generate_ollama(
                prompt=prompt,
                system=system,
                want_json=want_json,
                temperature=temperature,
                max_tokens=max_tokens,
                debug_label=debug_label,
                seed=seed,
            )
            if res and res.strip():
                self.last_successful_provider = "ollama"
                self.last_ollama_error = None
                self.stats["ollama_successes"] += 1
                return res.strip()
            raise RuntimeError("Ollama returned empty or whitespace response")
        except Exception as ollama_error:
            self.last_ollama_error = str(ollama_error)
            self.stats["failures"] += 1
            logger.error(f"[LLM] Both providers failed! Groq: {groq_error} | Ollama: {ollama_error}")
            raise RuntimeError(
                f"All AI text generation providers failed. Primary (Groq): {groq_error} | Fallback (Ollama): {ollama_error}"
            ) from ollama_error

    async def _generate_groq(
        self, prompt: str, system: Optional[str], want_json: bool, temperature: float, max_tokens: int, debug_label: Optional[str], seed: Optional[int]
    ) -> str:
        messages: List[Dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
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
        attempt = 0
        timeout_budget = min(settings.GROQ_TIMEOUT_SECONDS, 45.0)

        async with httpx.AsyncClient(timeout=timeout_budget) as client:
            while attempt <= 1:
                attempt += 1
                try:
                    res = await client.post(GROQ_CHAT_URL, json=payload, headers=headers)
                except httpx.TimeoutException as e:
                    raise TimeoutError(f"Groq request timed out after {timeout_budget:.1f}s") from e
                except httpx.HTTPError as e:
                    last_error = f"{type(e).__name__}: {e}"
                    if attempt <= 1:
                        await asyncio.sleep(0.5)
                        continue
                    raise RuntimeError(f"Groq network error: {last_error}") from e

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

                if res.status_code == 429:
                    wait = rate_limit_wait_seconds(res)
                    if wait <= MAX_RATE_LIMIT_WAIT_SECONDS and attempt <= 1:
                        logger.info(f"[LLM] Groq short rate limit ({wait:.1f}s); retrying once")
                        await asyncio.sleep(wait)
                        continue
                    # Fast fail and set circuit breaker active window
                    circuit_wait = min(max(wait, 30.0), 300.0)
                    self.groq_rate_limited_until = time.time() + circuit_wait
                    self.groq_rate_limit_reason = last_error
                    logger.warning(f"[LLM] Groq 429 rate limit reached. Circuit breaker active for {circuit_wait:.1f}s")
                    raise RateLimitError(f"Groq rate limit 429 ({last_error})")

                if res.status_code in {500, 502, 503, 504} and attempt <= 1:
                    await asyncio.sleep(0.5)
                    continue

                break

        raise RuntimeError(f"Groq request failed ({last_error})")

    async def _generate_ollama(
        self, prompt: str, system: Optional[str], want_json: bool, temperature: float, max_tokens: int, debug_label: Optional[str], seed: Optional[int]
    ) -> str:
        ok, reason = await self.validate_ollama()
        if not ok:
            raise RuntimeError(reason)

        ollama_model = self.ollama_model or settings.OLLAMA_LLM_MODEL
        # Bound token count for CPU execution to ensure fast, reliable completion
        bounded_predict = min(max_tokens, 1000)
        payload: Dict[str, Any] = {
            "model": ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": bounded_predict,
                "num_ctx": max(4096, min(12288, max_tokens + 4096)),
            },
        }
        if system:
            payload["system"] = system
        if seed is not None:
            payload["options"]["seed"] = seed
        if want_json:
            payload["format"] = "json"

        # Sequential execution on CPU prevents Ollama process starvation and ReadTimeout
        async with self._ollama_lock:
            async with httpx.AsyncClient(timeout=240.0) as client:
                try:
                    res = await client.post(f"{self.base_url}/api/generate", json=payload)
                    if res.status_code != 200:
                        raise RuntimeError(f"Ollama generation failed ({res.status_code}): {res.text[:200]}")
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
                    logger.warning(f"[LLM] Ollama call error: {e}")
                    raise RuntimeError(f"Ollama request failed ({type(e).__name__}): {e}") from e


llm_service = LLMService()

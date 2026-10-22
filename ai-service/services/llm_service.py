import asyncio
import json
import logging
import random
import re
import time
from typing import Any, Dict, List, Optional
import httpx
from groq import (
    AsyncGroq,
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    GroqError,
    InternalServerError,
    NotFoundError,
    RateLimitError,
)
from config.settings import settings

logger = logging.getLogger("ai_provider_manager")


class LLMService:
    """
    Unified AI Provider Manager.
    - Primary text-generation provider: Groq
    - Automatic fallback: Ollama (when Groq is rate-limited, timed out, unavailable, or misconfigured)
    - Circuit breaker & cooldown to avoid repeatedly stalling on transient Groq outages
    - Normalized response formatting for all PrepMind features
    """

    def __init__(self):
        self.primary_provider = settings.AI_PRIMARY_PROVIDER
        self.fallback_provider = settings.AI_FALLBACK_PROVIDER
        self.groq_api_key = settings.get_groq_key()
        self.groq_model = settings.GROQ_MODEL
        self.model = settings.GROQ_MODEL
        self.groq_base_url = "https://api.groq.com/openai/v1"
        self.groq_timeout = settings.GROQ_TIMEOUT_SECONDS
        self.groq_max_retries = settings.GROQ_MAX_RETRIES

        self.ollama_base_url = settings.OLLAMA_BASE_URL
        self.ollama_model = settings.OLLAMA_LLM_MODEL

        self._client: Optional[AsyncGroq] = None
        self._groq_cooldown_until: float = 0.0
        self._last_provider_used: str = "groq"
        self._last_fallback_reason: Optional[str] = None
        self._last_diagnostic_error_category: Optional[str] = None

        # Cache health check briefly to avoid redundant calls
        self._last_health_check_time: float = 0.0
        self._cached_health_result: Optional[Dict[str, Any]] = None

    def _get_groq_client(self) -> Optional[AsyncGroq]:
        current_key = settings.get_groq_key()
        if not current_key:
            return None
        if self._client is None or self.groq_api_key != current_key:
            self.groq_api_key = current_key
            self._client = AsyncGroq(
                api_key=self.groq_api_key,
                timeout=self.groq_timeout,
                max_retries=0,
            )
        return self._client

    @property
    def masked_api_key(self) -> str:
        key = settings.get_groq_key() or self.groq_api_key
        if not key:
            return "NOT_SET"
        if len(key) <= 8:
            return f"{key[:2]}***{key[-2:]}"
        return f"{key[:4]}...{key[-4:]}"

    async def check_health(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Verify Groq and Ollama status independently and return unified health report.
        """
        now = time.time()
        if not force_refresh and self._cached_health_result and (now - self._last_health_check_time < 15.0):
            return self._cached_health_result

        groq_key = settings.get_groq_key()
        groq_model = settings.GROQ_MODEL or self.groq_model
        groq_status: Dict[str, Any] = {
            "available": False,
            "provider": "groq",
            "model": groq_model,
            "configured": bool(groq_key),
            "cooldownActive": now < self._groq_cooldown_until,
            "error": None,
        }

        # 1. Check Groq Health
        if not groq_key:
            groq_status["error"] = "GROQ_API_KEY is not configured in backend environment."
            self._last_diagnostic_error_category = "KEY_NOT_CONFIGURED"
        else:
            try:
                async with httpx.AsyncClient(timeout=8.0) as http_client:
                    res = await http_client.get(
                        f"{self.groq_base_url}/models",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "User-Agent": "PrepMind-AI/1.0",
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        models = [m.get("id") for m in data.get("data", []) if isinstance(m, dict)]
                        model_found = groq_model in models
                        groq_status["available"] = True
                        groq_status["modelCompatible"] = model_found
                        if not model_found:
                            groq_status["warning"] = f"Configured model '{groq_model}' not found in active Groq model list."
                    elif res.status_code == 401:
                        groq_status["error"] = "Groq authentication failed (invalid GROQ_API_KEY)."
                        self._last_diagnostic_error_category = "AUTH_FAILED"
                    else:
                        groq_status["error"] = f"Groq API returned HTTP {res.status_code}"
                        self._last_diagnostic_error_category = "HTTP_ERROR"
            except Exception as e:
                groq_status["error"] = f"Groq connection check failed: {type(e).__name__}"
                self._last_diagnostic_error_category = "NETWORK_ERROR"

        # 2. Check Ollama Health
        ollama_status: Dict[str, Any] = {
            "available": False,
            "provider": "ollama",
            "model": settings.OLLAMA_LLM_MODEL,
            "error": None,
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as http_client:
                res = await http_client.get(f"{self.ollama_base_url}/api/tags")
                if res.status_code == 200:
                    installed_models = [m.get("name") for m in res.json().get("models", [])]
                    model_match = any(
                        settings.OLLAMA_LLM_MODEL in m or m.startswith(settings.OLLAMA_LLM_MODEL.split(":")[0])
                        for m in installed_models
                    )
                    ollama_status["available"] = True
                    ollama_status["installedModels"] = installed_models
                    ollama_status["modelPresent"] = model_match
                else:
                    ollama_status["error"] = f"Ollama returned HTTP {res.status_code}"
        except Exception as e:
            ollama_status["error"] = f"Ollama service unreachable at {self.ollama_base_url}: {type(e).__name__}"

        # Overall availability
        primary_ok = groq_status["available"]
        fallback_ok = ollama_status["available"]
        is_available = primary_ok or fallback_ok

        active_provider = "groq" if primary_ok else ("ollama" if fallback_ok else "none")

        result = {
            "available": is_available,
            "status": "ok" if is_available else "unavailable",
            "primaryProvider": "groq",
            "fallbackProvider": "ollama",
            "activeProvider": active_provider,
            "groq": groq_status,
            "ollama": ollama_status,
            "lastProviderUsed": self._last_provider_used,
            "lastFallbackReason": self._last_fallback_reason,
            "lastErrorCategory": self._last_diagnostic_error_category,
        }

        self._cached_health_result = result
        self._last_health_check_time = now
        return result

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        format_json: bool = False,
        format_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        debug_label: Optional[str] = None,
        seed: Optional[int] = None,
    ) -> str:
        """
        Execute text generation with automatic Groq -> Ollama fallback.
        1. Tries Groq first (if not in circuit-breaker cooldown).
        2. If Groq fails with transient error, rate limit, timeout, or model issue, automatically falls back to Ollama.
        3. Returns normalized string output.
        """
        label = debug_label or "AI_GEN"
        now = time.time()
        in_cooldown = now < self._groq_cooldown_until

        groq_error: Optional[Exception] = None

        # Attempt 1: Groq (if not in cooldown)
        if not in_cooldown:
            try:
                res = await self._generate_with_groq(
                    prompt=prompt,
                    system=system,
                    format_json=format_json,
                    format_schema=format_schema,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    debug_label=label,
                    seed=seed,
                )
                self._last_provider_used = "groq"
                self._last_fallback_reason = None
                return res
            except Exception as e:
                groq_error = e
                error_msg = str(e)
                logger.warning("[%s] Primary provider (Groq) failed: %s", label, error_msg)

                # Set circuit breaker cooldown
                is_rate_limit = isinstance(e, RateLimitError) or "rate limit" in error_msg.lower()
                is_auth_error = isinstance(e, AuthenticationError) or "authentication" in error_msg.lower()
                is_model_error = isinstance(e, NotFoundError) or "model_not_found" in error_msg.lower()

                cooldown_sec = 45.0 if is_rate_limit else (60.0 if (is_auth_error or is_model_error) else 30.0)
                self._groq_cooldown_until = now + cooldown_sec
                self._last_fallback_reason = f"Groq {type(e).__name__}: {error_msg[:120]}"

        else:
            remaining = int(self._groq_cooldown_until - now)
            logger.info("[%s] Groq in circuit-breaker cooldown (%ds remaining). Routing directly to Ollama fallback.", label, remaining)
            self._last_fallback_reason = f"Groq circuit-breaker active ({remaining}s remaining)"

        # Attempt 2: Ollama Fallback
        if self.fallback_provider == "ollama":
            logger.info("[%s] Automatically executing fallback via Ollama (%s)", label, self.ollama_model)
            try:
                res = await self._generate_with_ollama(
                    prompt=prompt,
                    system=system,
                    format_json=format_json,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    debug_label=label,
                )
                self._last_provider_used = "ollama"
                logger.info("[%s] Ollama fallback generation succeeded", label)
                return res
            except Exception as ollama_err:
                err_detail = f"{type(ollama_err).__name__}: {str(ollama_err) or 'timed out or connection lost'}"
                logger.error("[%s] Ollama fallback also failed: %s", label, err_detail)
                primary_desc = f"Groq error: {groq_error}" if groq_error else "Groq was in cooldown"
                raise RuntimeError(
                    f"AI generation failed across all providers. {primary_desc} | Fallback Ollama error: {err_detail}"
                ) from ollama_err

        # If fallback is disabled
        if groq_error:
            raise groq_error
        raise RuntimeError("AI generation unavailable. Groq is in cooldown and fallback provider is not configured.")

    async def _generate_with_groq(
        self,
        prompt: str,
        system: Optional[str] = None,
        format_json: bool = False,
        format_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        debug_label: Optional[str] = None,
        seed: Optional[int] = None,
    ) -> str:
        key = settings.get_groq_key()
        if not key:
            raise RuntimeError("GROQ_API_KEY is not configured in backend environment file.")

        client = self._get_groq_client()
        if client is None:
            raise RuntimeError("Could not initialize Groq client.")

        messages = []
        effective_system = system or "You are PrepMind AI, an advanced, highly accurate academic AI assistant."
        is_json_request = format_json or (format_schema is not None)

        if is_json_request and "json" not in effective_system.lower():
            effective_system += "\nYou must output your response exclusively as a valid JSON object."

        messages.append({"role": "system", "content": effective_system})

        effective_prompt = prompt
        if is_json_request and "json" not in effective_prompt.lower():
            effective_prompt += "\nRespond with a valid JSON object."

        messages.append({"role": "user", "content": effective_prompt})

        # Ensure reasoning models have enough completion room (min 2048)
        resolved_max_tokens = max(2048, max_tokens)

        request_kwargs: Dict[str, Any] = {
            "model": settings.GROQ_MODEL or self.groq_model,
            "messages": messages,
            "temperature": max(0.0, min(1.0, temperature)),
            "max_tokens": resolved_max_tokens,
        }

        if is_json_request:
            request_kwargs["response_format"] = {"type": "json_object"}

        if seed is not None:
            request_kwargs["seed"] = seed % (2**31)

        response = await client.chat.completions.create(**request_kwargs)
        content = ""
        if response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content or ""

        return content.strip()

    async def _generate_with_ollama(
        self,
        prompt: str,
        system: Optional[str] = None,
        format_json: bool = False,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        debug_label: Optional[str] = None,
    ) -> str:
        url = f"{self.ollama_base_url}/api/generate"
        effective_system = system or "You are PrepMind AI, an advanced, highly accurate academic AI assistant."
        if format_json and "json" not in effective_system.lower():
            effective_system += "\nYou must output your response exclusively as a valid JSON object."

        payload: Dict[str, Any] = {
            "model": settings.OLLAMA_LLM_MODEL,
            "prompt": prompt,
            "system": effective_system,
            "stream": False,
            "options": {
                "temperature": max(0.0, min(1.0, temperature)),
                "num_predict": max_tokens,
            },
        }

        if format_json:
            payload["format"] = "json"

        async with httpx.AsyncClient(timeout=180.0) as http_client:
            res = await http_client.post(url, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Ollama generation failed with HTTP {res.status_code}: {res.text[:200]}")
            data = res.json()
            return (data.get("response") or "").strip()


llm_service = LLMService()

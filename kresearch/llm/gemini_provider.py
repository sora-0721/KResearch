"""Google Gemini LLM provider implementation (google-genai SDK)."""

from __future__ import annotations

import os
from typing import AsyncIterator

from .base import LLMProvider
from .models import GEMINI_MODELS
from .registry import register


def _resolve_api_key(api_key: str | None) -> str | None:
    """Return a non-empty API key or None."""
    if api_key:
        return api_key
    for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        val = os.environ.get(var, "").strip()
        if val:
            return val
    return None


class GeminiProvider(LLMProvider):
    """Provider backed by the google-genai SDK (>=1.0)."""

    def __init__(self, api_key: str | None = None, **kwargs):
        resolved = _resolve_api_key(api_key)
        super().__init__(api_key=resolved, **kwargs)
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self._api_key:
                raise RuntimeError(
                    "Gemini API key not set. Please set GEMINI_API_KEY or "
                    "GOOGLE_API_KEY in your .env file."
                )
            from google import genai
            self._client = genai.Client(api_key=self._api_key)
        return self._client

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def available_models(self) -> list[str]:
        return list(GEMINI_MODELS)

    def is_available(self) -> bool:
        try:
            from google import genai  # noqa: F401
        except ImportError:
            return False
        return bool(self._api_key)

    def supports_json_mode(self) -> bool:
        return True

    def supports_grounding(self) -> bool:
        return True

    def _build_contents(self, messages: list[dict]):
        """Convert chat messages into Gemini-compatible contents list."""
        contents = []
        for msg in messages:
            role = msg.get("role", "user")
            if role == "system":
                continue
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": msg["content"]}]})
        return contents

    def _extract_system(self, messages: list[dict], system_prompt: str | None):
        """Extract system instruction from messages and explicit prompt."""
        parts: list[str] = []
        if system_prompt:
            parts.append(system_prompt)
        for m in messages:
            if m.get("role") == "system":
                parts.append(m["content"])
        return "\n\n".join(parts) if parts else None

    async def complete(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False,
        system_prompt: str | None = None,
    ) -> dict:
        client = self._get_client()
        sys_inst = self._extract_system(messages, system_prompt)

        config: dict = {"temperature": temperature, "max_output_tokens": max_tokens}
        if sys_inst:
            config["system_instruction"] = sys_inst
        if json_mode:
            config["response_mime_type"] = "application/json"

        contents = self._build_contents(messages)
        response = await client.aio.models.generate_content(
            model=model, contents=contents, config=config,
        )

        text = response.text or ""
        usage = getattr(response, "usage_metadata", None)

        return {
            "content": text,
            "model": model,
            "usage": {
                "input_tokens": getattr(usage, "prompt_token_count", 0),
                "output_tokens": getattr(usage, "candidates_token_count", 0),
            },
        }

    async def stream(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        client = self._get_client()
        sys_inst = self._extract_system(messages, system_prompt)

        config: dict = {"temperature": temperature, "max_output_tokens": max_tokens}
        if sys_inst:
            config["system_instruction"] = sys_inst

        contents = self._build_contents(messages)
        async for chunk in client.aio.models.generate_content_stream(
            model=model, contents=contents, config=config,
        ):
            if chunk.text:
                yield chunk.text


register("gemini", GeminiProvider)

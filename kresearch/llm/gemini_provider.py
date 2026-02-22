"""Google Gemini LLM provider implementation."""

from __future__ import annotations

import os
from typing import AsyncIterator

from .base import LLMProvider
from .models import GEMINI_MODELS
from .registry import register


class GeminiProvider(LLMProvider):
    """Provider backed by the Google Generative AI SDK."""

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key or os.environ.get("GOOGLE_API_KEY"), **kwargs)
        self._client = None

    def _get_client(self):
        if self._client is None:
            import google.generativeai as genai

            genai.configure(api_key=self._api_key)
            self._client = genai
        return self._client

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def available_models(self) -> list[str]:
        return list(GEMINI_MODELS)

    def is_available(self) -> bool:
        try:
            import google.generativeai  # noqa: F401
        except ImportError:
            return False
        return self._api_key is not None

    def supports_json_mode(self) -> bool:
        return True

    def supports_grounding(self) -> bool:
        return True

    def _build_contents(self, messages: list[dict], system_prompt: str | None):
        """Convert chat messages into Gemini-compatible contents list."""
        contents: list[dict] = []
        for msg in messages:
            role = msg.get("role", "user")
            if role == "system":
                continue  # handled separately
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [msg["content"]]})
        return contents

    async def complete(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False,
        system_prompt: str | None = None,
    ) -> dict:
        genai = self._get_client()

        system_parts: list[str] = []
        if system_prompt:
            system_parts.append(system_prompt)
        for m in messages:
            if m.get("role") == "system":
                system_parts.append(m["content"])

        gen_config: dict = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        if json_mode:
            gen_config["response_mime_type"] = "application/json"

        gm = genai.GenerativeModel(
            model_name=model,
            system_instruction="\n\n".join(system_parts) if system_parts else None,
            generation_config=gen_config,
        )
        contents = self._build_contents(messages, system_prompt)
        response = await gm.generate_content_async(contents)

        text = response.text or ""
        usage_meta = getattr(response, "usage_metadata", None)

        return {
            "content": text,
            "model": model,
            "usage": {
                "input_tokens": getattr(usage_meta, "prompt_token_count", 0),
                "output_tokens": getattr(usage_meta, "candidates_token_count", 0),
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
        genai = self._get_client()

        system_parts: list[str] = []
        if system_prompt:
            system_parts.append(system_prompt)
        for m in messages:
            if m.get("role") == "system":
                system_parts.append(m["content"])

        gm = genai.GenerativeModel(
            model_name=model,
            system_instruction="\n\n".join(system_parts) if system_parts else None,
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
        )
        contents = self._build_contents(messages, system_prompt)
        response = await gm.generate_content_async(contents, stream=True)
        async for chunk in response:
            if chunk.text:
                yield chunk.text


register("gemini", GeminiProvider)

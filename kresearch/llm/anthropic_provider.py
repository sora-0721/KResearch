"""Anthropic LLM provider implementation."""

from __future__ import annotations

import os
from typing import AsyncIterator

from .base import LLMProvider
from .models import ANTHROPIC_MODELS
from .registry import register


class AnthropicProvider(LLMProvider):
    """Provider backed by the Anthropic API (AsyncAnthropic SDK)."""

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"), **kwargs)
        self._client = None

    def _get_client(self):
        if self._client is None:
            from anthropic import AsyncAnthropic

            self._client = AsyncAnthropic(api_key=self._api_key)
        return self._client

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def available_models(self) -> list[str]:
        return list(ANTHROPIC_MODELS)

    def is_available(self) -> bool:
        try:
            import anthropic  # noqa: F401
        except ImportError:
            return False
        return self._api_key is not None

    def supports_json_mode(self) -> bool:
        return False

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

        # Anthropic requires separating system from user/assistant messages.
        filtered = [m for m in messages if m.get("role") != "system"]
        system_parts: list[str] = []
        if system_prompt:
            system_parts.append(system_prompt)
        for m in messages:
            if m.get("role") == "system":
                system_parts.append(m["content"])

        kwargs: dict = {
            "model": model,
            "messages": filtered,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_parts:
            kwargs["system"] = "\n\n".join(system_parts)

        response = await client.messages.create(**kwargs)

        content = ""
        for block in response.content:
            if hasattr(block, "text"):
                content += block.text

        return {
            "content": content,
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
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

        filtered = [m for m in messages if m.get("role") != "system"]
        system_parts: list[str] = []
        if system_prompt:
            system_parts.append(system_prompt)
        for m in messages:
            if m.get("role") == "system":
                system_parts.append(m["content"])

        kwargs: dict = {
            "model": model,
            "messages": filtered,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_parts:
            kwargs["system"] = "\n\n".join(system_parts)

        async with client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text


register("anthropic", AnthropicProvider)

"""DeepSeek LLM provider implementation (OpenAI-compatible API via httpx)."""

from __future__ import annotations

import json
import os
from typing import AsyncIterator

from .base import LLMProvider
from .models import DEEPSEEK_MODELS
from .registry import register

_BASE_URL = "https://api.deepseek.com/v1"


class DeepSeekProvider(LLMProvider):
    """Provider for DeepSeek models using the OpenAI-compatible REST API."""

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key or os.environ.get("DEEPSEEK_API_KEY"), **kwargs)

    @property
    def name(self) -> str:
        return "deepseek"

    @property
    def available_models(self) -> list[str]:
        return list(DEEPSEEK_MODELS)

    def is_available(self) -> bool:
        return self._api_key is not None

    def supports_json_mode(self) -> bool:
        return True

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
        system_prompt: str | None,
        stream: bool = False,
    ) -> dict:
        msgs = list(messages)
        if system_prompt:
            msgs = [{"role": "system", "content": system_prompt}, *msgs]
        return {
            "model": model,
            "messages": msgs,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

    async def complete(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False,
        system_prompt: str | None = None,
    ) -> dict:
        import httpx

        payload = self._build_payload(messages, model, temperature, max_tokens, system_prompt)
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{_BASE_URL}/chat/completions", headers=self._headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()

        choice = data["choices"][0]
        usage = data.get("usage", {})
        return {
            "content": choice["message"]["content"],
            "model": data.get("model", model),
            "usage": {
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
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
        import httpx

        payload = self._build_payload(messages, model, temperature, max_tokens, system_prompt, stream=True)

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{_BASE_URL}/chat/completions", headers=self._headers(), json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[len("data: "):]
                    if raw.strip() == "[DONE]":
                        break
                    chunk = json.loads(raw)
                    delta = chunk["choices"][0].get("delta", {})
                    if delta.get("content"):
                        yield delta["content"]


register("deepseek", DeepSeekProvider)

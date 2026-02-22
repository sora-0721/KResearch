"""Ollama local LLM provider implementation."""

from __future__ import annotations

from typing import AsyncIterator

from .base import LLMProvider
from .models import OLLAMA_MODELS
from .registry import register


class OllamaProvider(LLMProvider):
    """Provider for locally-running Ollama models."""

    def __init__(self, api_key: str | None = None, host: str = "http://localhost:11434", **kwargs):
        super().__init__(api_key=None, **kwargs)
        self._host = host
        self._client = None

    def _get_client(self):
        if self._client is None:
            from ollama import AsyncClient

            self._client = AsyncClient(host=self._host)
        return self._client

    @property
    def name(self) -> str:
        return "ollama"

    @property
    def available_models(self) -> list[str]:
        return list(OLLAMA_MODELS)

    def is_available(self) -> bool:
        try:
            import httpx  # noqa: F401
        except ImportError:
            return False
        try:
            import httpx as _httpx

            resp = _httpx.get(f"{self._host}/api/version", timeout=3)
            return resp.status_code == 200
        except Exception:
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
        msgs = list(messages)
        if system_prompt:
            msgs = [{"role": "system", "content": system_prompt}, *msgs]

        kwargs: dict = {
            "model": model,
            "messages": msgs,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if json_mode:
            kwargs["format"] = "json"

        response = await client.chat(**kwargs)

        return {
            "content": response["message"]["content"],
            "model": response.get("model", model),
            "usage": {
                "input_tokens": response.get("prompt_eval_count", 0),
                "output_tokens": response.get("eval_count", 0),
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
        msgs = list(messages)
        if system_prompt:
            msgs = [{"role": "system", "content": system_prompt}, *msgs]

        response = await client.chat(
            model=model,
            messages=msgs,
            options={"temperature": temperature, "num_predict": max_tokens},
            stream=True,
        )
        async for chunk in response:
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content


register("ollama", OllamaProvider)

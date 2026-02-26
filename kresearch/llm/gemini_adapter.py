"""Legacy google-generativeai SDK adapter for Gemini provider."""

from __future__ import annotations

from typing import AsyncIterator


class LegacyGeminiAdapter:
    """Wraps the legacy google-generativeai SDK."""

    def __init__(self, api_key: str):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._genai = genai

    async def complete(self, messages, model, temperature,
                       max_tokens, json_mode, system_instruction):
        gen_cfg: dict = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        if json_mode:
            gen_cfg["response_mime_type"] = "application/json"

        gm = self._genai.GenerativeModel(
            model_name=model,
            system_instruction=system_instruction,
            generation_config=gen_cfg,
        )
        resp = await gm.generate_content_async(messages)
        usage = getattr(resp, "usage_metadata", None)
        return {
            "content": resp.text or "",
            "model": model,
            "usage": {
                "input_tokens": getattr(usage, "prompt_token_count", 0),
                "output_tokens": getattr(usage, "candidates_token_count", 0),
            },
        }

    async def stream(self, messages, model, temperature,
                     max_tokens, system_instruction) -> AsyncIterator[str]:
        gm = self._genai.GenerativeModel(
            model_name=model,
            system_instruction=system_instruction,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            },
        )
        resp = await gm.generate_content_async(messages, stream=True)
        async for chunk in resp:
            if chunk.text:
                yield chunk.text


class NewGeminiAdapter:
    """Wraps the google-genai SDK (>=1.0)."""

    def __init__(self, api_key: str):
        from google import genai
        self._client = genai.Client(api_key=api_key)

    async def complete(self, messages, model, temperature,
                       max_tokens, json_mode, system_instruction):
        cfg: dict = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        if system_instruction:
            cfg["system_instruction"] = system_instruction
        if json_mode:
            cfg["response_mime_type"] = "application/json"

        resp = await self._client.aio.models.generate_content(
            model=model, contents=messages, config=cfg,
        )
        usage = getattr(resp, "usage_metadata", None)
        return {
            "content": resp.text or "",
            "model": model,
            "usage": {
                "input_tokens": getattr(usage, "prompt_token_count", 0),
                "output_tokens": getattr(usage, "candidates_token_count", 0),
            },
        }

    async def stream(self, messages, model, temperature,
                     max_tokens, system_instruction) -> AsyncIterator[str]:
        cfg: dict = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        if system_instruction:
            cfg["system_instruction"] = system_instruction
        async for chunk in self._client.aio.models.generate_content_stream(
            model=model, contents=messages, config=cfg,
        ):
            if chunk.text:
                yield chunk.text


def create_adapter(api_key: str):
    """Create the best available Gemini SDK adapter."""
    try:
        return NewGeminiAdapter(api_key)
    except ImportError:
        return LegacyGeminiAdapter(api_key)

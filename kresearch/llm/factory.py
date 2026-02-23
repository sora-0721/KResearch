"""Factory functions for creating LLM provider instances."""

from __future__ import annotations

import os
from typing import Any

from .base import LLMProvider
from .registry import get_provider_class

# Mapping from provider name to the environment variable holding its API key.
_ENV_KEY_MAP: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GOOGLE_API_KEY",
    "grok": "XAI_API_KEY",
    "perplexity": "PERPLEXITY_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    # ollama does not require an API key
}


def create_provider(
    provider_name: str,
    api_key: str | None = None,
    **kwargs: Any,
) -> LLMProvider:
    """
    Create and return an LLM provider instance.

    If *api_key* is not supplied, the factory will attempt to read it from the
    appropriate environment variable.
    """
    name_lower = provider_name.lower()

    if api_key is None:
        env_var = _ENV_KEY_MAP.get(name_lower)
        if env_var:
            api_key = os.environ.get(env_var)

    cls = get_provider_class(name_lower)
    return cls(api_key=api_key, **kwargs)


def get_llm_provider(config: Any) -> LLMProvider:
    """
    Convenience helper that reads provider name and optional api_key from a
    configuration object or dict, then delegates to :func:`create_provider`.

    Accepts either a dict with "provider" key or a Pydantic model with
    ``provider`` attribute (e.g. ``LLMConfig``).
    """
    if isinstance(config, dict):
        config = dict(config)
        provider_name: str = config.pop("provider")
        api_key: str | None = config.pop("api_key", None)
        return create_provider(provider_name, api_key=api_key, **config)
    # Pydantic model or object with attributes
    provider_name = getattr(config, "provider", "openai")
    api_key = getattr(config, "api_key", None)
    return create_provider(provider_name, api_key=api_key)

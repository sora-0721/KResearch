"""Factory functions for creating search provider instances."""

from __future__ import annotations

import os
from typing import Any

from .base import SearchProvider
from .registry import get_provider_class, list_providers

# Default API-key environment variable names per provider.
_ENV_KEY_MAP: dict[str, str | list[str]] = {
    "tavily": "TAVILY_API_KEY",
    "serpapi": "SERPAPI_KEY",
    "jina": "JINA_API_KEY",
    "google_cse": ["GOOGLE_API_KEY", "GOOGLE_CSE_ID"],
    "gemini_grounding": "GOOGLE_API_KEY",
}


def create_provider(
    name: str,
    api_key: str | None = None,
    **kwargs: Any,
) -> SearchProvider:
    """
    Instantiate a search provider by name.

    If *api_key* is ``None`` the factory will attempt to read the
    appropriate environment variable automatically.
    """
    key = name.lower()
    cls = get_provider_class(key)

    # Auto-resolve API key from environment when not supplied.
    if api_key is None:
        env_spec = _ENV_KEY_MAP.get(key)
        if isinstance(env_spec, str):
            api_key = os.getenv(env_spec)
        elif isinstance(env_spec, list):
            # For providers needing multiple keys, pass first as api_key
            api_key = os.getenv(env_spec[0])
            # Inject additional keys into kwargs
            for extra in env_spec[1:]:
                kwarg_name = extra.lower()
                if kwarg_name not in kwargs:
                    kwargs[kwarg_name] = os.getenv(extra)

    return cls(api_key=api_key, **kwargs)


def get_search_provider(config: Any = None) -> SearchProvider:
    """
    Return a ready-to-use search provider based on *config*.

    Accepts either a dict or a Pydantic model with a ``provider`` attribute.
    If no config is given the free DuckDuckGo provider is returned.
    """
    _ensure_providers_loaded()

    if config is None:
        return create_provider("duckduckgo")

    if isinstance(config, dict):
        config = dict(config)
        name = config.pop("provider", "duckduckgo")
        api_key = config.pop("api_key", None)
        return create_provider(name, api_key=api_key, **config)

    # Pydantic model or object with attributes
    name = getattr(config, "provider", "duckduckgo")
    api_key = getattr(config, "api_key", None)
    return create_provider(name, api_key=api_key)


def _ensure_providers_loaded() -> None:
    """Import all provider modules so they self-register."""
    if list_providers():
        return  # Already loaded
    # fmt: off
    from . import (  # noqa: F401
        duckduckgo_provider,
        gemini_grounding,
        google_cse_provider,
        jina_provider,
        scraper_provider,
        serpapi_provider,
        tavily_provider,
    )
    # fmt: on

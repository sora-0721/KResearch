"""Search provider package for KResearch.

Exposes the core API so consumers can write::

    from kresearch.search import SearchProvider, SearchFactory, get_search_provider
"""

from .base import SearchProvider
from .factory import create_provider, get_search_provider
from .models import FREE_PROVIDERS, SEARCH_PROVIDERS, SearchResult
from .registry import (
    get_provider_class,
    list_free_providers,
    list_providers,
    register,
)

# Convenience alias expected by the specification.
SearchFactory = create_provider

__all__ = [
    "SearchProvider",
    "SearchResult",
    "SearchFactory",
    "create_provider",
    "get_search_provider",
    "get_provider_class",
    "list_providers",
    "list_free_providers",
    "register",
    "SEARCH_PROVIDERS",
    "FREE_PROVIDERS",
]

# ---------------------------------------------------------------------------
# Auto-import all provider modules so they self-register on first import.
# ---------------------------------------------------------------------------
def _load_providers() -> None:
    from . import (  # noqa: F401
        duckduckgo_provider,
        gemini_grounding,
        google_cse_provider,
        jina_provider,
        scraper_provider,
        serpapi_provider,
        tavily_provider,
    )


_load_providers()

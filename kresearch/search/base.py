"""Abstract base class for search providers."""

from __future__ import annotations

from abc import ABC, abstractmethod


class SearchProvider(ABC):
    """Abstract base class that all search providers must implement."""

    def __init__(self, api_key: str | None = None, **kwargs):
        self._api_key = api_key

    # ------------------------------------------------------------------
    # Abstract interface
    # ------------------------------------------------------------------

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name (e.g. 'duckduckgo', 'tavily')."""
        ...

    @property
    @abstractmethod
    def is_free(self) -> bool:
        """Return True if the provider can be used without a paid API key."""
        ...

    @abstractmethod
    async def search(
        self,
        query: str,
        max_results: int = 10,
    ) -> list[dict]:
        """
        Execute a web search and return results.

        Each dict in the returned list contains:
            - title (str): Page title.
            - url (str): Page URL.
            - snippet (str): Short text excerpt.
            - source (str): Provider name that produced this result.
        """
        ...

    # ------------------------------------------------------------------
    # Optional overrides
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        """Check whether the provider is usable (SDK present, key set, etc.)."""
        return self._api_key is not None

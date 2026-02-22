"""DuckDuckGo search provider (free, default)."""

from __future__ import annotations

import asyncio
import logging

from .base import SearchProvider
from .registry import register

logger = logging.getLogger(__name__)


class DuckDuckGoSearchProvider(SearchProvider):
    """Free web search using the ``duckduckgo_search`` SDK.

    This is the default provider -- it requires no API key and is always
    available as long as the ``duckduckgo_search`` package is installed.
    """

    def __init__(self, api_key: str | None = None, **kwargs):
        # DuckDuckGo needs no key; accept for interface compatibility.
        super().__init__(api_key=api_key, **kwargs)
        self._region: str = kwargs.get("region", "wt-wt")
        self._safesearch: str = kwargs.get("safesearch", "moderate")

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "duckduckgo"

    @property
    def is_free(self) -> bool:
        return True

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        """Always available -- no key needed. Just checks for the SDK."""
        try:
            from duckduckgo_search import DDGS  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        """Run a DuckDuckGo text search with retry logic."""
        return await asyncio.to_thread(
            self._sync_search, query, max_results,
        )

    def _sync_search(
        self, query: str, max_results: int, _retries: int = 3,
    ) -> list[dict]:
        """Synchronous search with basic retry/back-off."""
        from duckduckgo_search import DDGS
        import time

        last_err: Exception | None = None
        for attempt in range(1, _retries + 1):
            try:
                with DDGS() as ddgs:
                    raw_results = list(
                        ddgs.text(
                            query,
                            region=self._region,
                            safesearch=self._safesearch,
                            max_results=max_results,
                        )
                    )
                return self._normalise(raw_results)
            except Exception as exc:
                last_err = exc
                logger.warning(
                    "DuckDuckGo attempt %d/%d failed: %s",
                    attempt, _retries, exc,
                )
                if attempt < _retries:
                    time.sleep(1.0 * attempt)

        logger.error("DuckDuckGo search failed after %d retries", _retries)
        if last_err:
            raise last_err
        return []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _normalise(self, raw: list[dict]) -> list[dict]:
        """Convert raw DDG results into the standard schema."""
        results: list[dict] = []
        for item in raw:
            results.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("href", item.get("link", "")),
                    "snippet": item.get("body", item.get("snippet", "")),
                    "source": self.name,
                    "raw": item,
                }
            )
        return results

    async def news(self, query: str, max_results: int = 10) -> list[dict]:
        """Search DuckDuckGo News."""
        return await asyncio.to_thread(self._sync_news, query, max_results)

    def _sync_news(self, query: str, max_results: int) -> list[dict]:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            raw = list(
                ddgs.news(
                    query,
                    region=self._region,
                    safesearch=self._safesearch,
                    max_results=max_results,
                )
            )
        return self._normalise(raw)


register("duckduckgo", DuckDuckGoSearchProvider)

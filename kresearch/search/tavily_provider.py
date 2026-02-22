"""Tavily search provider (paid)."""

from __future__ import annotations

import os

from .base import SearchProvider
from .registry import register


class TavilySearchProvider(SearchProvider):
    """AI-optimised web search powered by the Tavily API."""

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key or os.getenv("TAVILY_API_KEY"), **kwargs)
        self._client = None

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "tavily"

    @property
    def is_free(self) -> bool:
        return False

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        if not self._api_key:
            return False
        try:
            from tavily import TavilyClient  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def _get_client(self):
        if self._client is None:
            from tavily import TavilyClient
            self._client = TavilyClient(api_key=self._api_key)
        return self._client

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        """Run a Tavily search and return normalised results."""
        import asyncio

        client = self._get_client()
        # TavilyClient.search is synchronous; run in a thread.
        response = await asyncio.to_thread(
            client.search,
            query=query,
            max_results=max_results,
            search_depth="advanced",
        )

        results: list[dict] = []
        for item in response.get("results", []):
            results.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                    "source": self.name,
                    "raw": item,
                }
            )
        return results


register("tavily", TavilySearchProvider)

"""SerpAPI search provider (paid)."""

from __future__ import annotations

import os

from .base import SearchProvider
from .registry import register


class SerpAPISearchProvider(SearchProvider):
    """Web search using SerpAPI (Google results proxy)."""

    BASE_URL = "https://serpapi.com/search.json"

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key or os.getenv("SERPAPI_KEY"), **kwargs)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "serpapi"

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
            import httpx  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        """Query SerpAPI and return normalised results."""
        import httpx

        params = {
            "q": query,
            "api_key": self._api_key,
            "engine": "google",
            "num": max_results,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(self.BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        results: list[dict] = []
        for item in data.get("organic_results", [])[:max_results]:
            results.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "source": self.name,
                    "raw": item,
                }
            )
        return results


register("serpapi", SerpAPISearchProvider)

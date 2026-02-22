"""Jina AI search / reader provider (free tier available)."""

from __future__ import annotations

import os

from .base import SearchProvider
from .registry import register


class JinaSearchProvider(SearchProvider):
    """Web search and page reading via Jina AI's free-tier APIs."""

    SEARCH_URL = "https://s.jina.ai/{query}"
    READER_URL = "https://r.jina.ai/{url}"

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key or os.getenv("JINA_API_KEY"), **kwargs)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "jina"

    @property
    def is_free(self) -> bool:
        return True

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        """Jina works without a key (rate-limited), so always available."""
        try:
            import httpx  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Accept": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        """Search the web via Jina's search endpoint."""
        import httpx

        url = self.SEARCH_URL.format(query=query)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()

        results: list[dict] = []
        items = data.get("data", data.get("results", []))
        for item in items[:max_results]:
            results.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("description", item.get("content", "")),
                    "source": self.name,
                    "raw": item,
                }
            )
        return results

    async def read_page(self, page_url: str) -> str:
        """Read and extract text from a page via Jina Reader."""
        import httpx

        url = self.READER_URL.format(url=page_url)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()

        return data.get("data", {}).get("content", "")


register("jina", JinaSearchProvider)

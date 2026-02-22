"""Google Custom Search Engine provider (paid)."""

from __future__ import annotations

import os

from .base import SearchProvider
from .registry import register


class GoogleCSESearchProvider(SearchProvider):
    """Web search via the Google Custom Search JSON API."""

    BASE_URL = "https://www.googleapis.com/customsearch/v1"

    def __init__(
        self,
        api_key: str | None = None,
        *,
        google_cse_id: str | None = None,
        **kwargs,
    ):
        super().__init__(
            api_key=api_key or os.getenv("GOOGLE_API_KEY"),
            **kwargs,
        )
        self._cse_id = google_cse_id or os.getenv("GOOGLE_CSE_ID")

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "google_cse"

    @property
    def is_free(self) -> bool:
        return False

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        if not self._api_key or not self._cse_id:
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
        """Query Google CSE and return normalised results."""
        import httpx

        # Google CSE caps at 10 per request; handle pagination if needed.
        num = min(max_results, 10)
        params = {
            "key": self._api_key,
            "cx": self._cse_id,
            "q": query,
            "num": num,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(self.BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        results: list[dict] = []
        for item in data.get("items", [])[:max_results]:
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


register("google_cse", GoogleCSESearchProvider)

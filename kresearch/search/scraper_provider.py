"""Direct web-scraper search provider (free)."""

from __future__ import annotations

import asyncio
import logging

from .base import SearchProvider
from .registry import register

logger = logging.getLogger(__name__)

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; KResearchBot/1.0; +https://github.com/kresearch)"
    ),
}


class ScraperSearchProvider(SearchProvider):
    """Finds pages via DuckDuckGo, then scrapes them with aiohttp + BS4."""

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(api_key=api_key, **kwargs)
        self._timeout: int = kwargs.get("timeout", 15)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "scraper"

    @property
    def is_free(self) -> bool:
        return True

    def is_available(self) -> bool:
        try:
            import aiohttp, bs4  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        """Search DuckDuckGo for URLs, then scrape each page."""
        urls = await self._discover_urls(query, max_results)
        tasks = [self._scrape(u) for u in urls]
        scraped = await asyncio.gather(*tasks, return_exceptions=True)

        results: list[dict] = []
        for url, page in zip(urls, scraped):
            if isinstance(page, Exception):
                logger.debug("Failed to scrape %s: %s", url, page)
                continue
            results.append(
                {
                    "title": page.get("title", ""),
                    "url": url,
                    "snippet": page.get("text", "")[:500],
                    "source": self.name,
                    "raw": page,
                }
            )
        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _discover_urls(self, query: str, max_results: int) -> list[str]:
        """Use DuckDuckGo to find relevant URLs."""
        from duckduckgo_search import DDGS

        def _search():
            with DDGS() as ddgs:
                return [
                    r.get("href", r.get("link", ""))
                    for r in ddgs.text(query, max_results=max_results)
                ]

        return await asyncio.to_thread(_search)

    async def _scrape(self, url: str) -> dict:
        """Fetch a URL and extract text via BeautifulSoup."""
        import aiohttp
        from bs4 import BeautifulSoup

        timeout = aiohttp.ClientTimeout(total=self._timeout)
        async with aiohttp.ClientSession(
            timeout=timeout, headers=_DEFAULT_HEADERS,
        ) as session:
            async with session.get(url) as resp:
                resp.raise_for_status()
                html = await resp.text()

        soup = BeautifulSoup(html, "html.parser")

        # Remove script/style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        text = soup.get_text(separator="\n", strip=True)

        return {"title": title, "text": text}


register("scraper", ScraperSearchProvider)

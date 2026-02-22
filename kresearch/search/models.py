"""Data models and constants for search providers."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SearchResult:
    """A single search result returned by any search provider."""

    title: str
    url: str
    snippet: str
    source: str
    raw: dict | None = field(default=None, repr=False)

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary."""
        d: dict = {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
            "source": self.source,
        }
        if self.raw is not None:
            d["raw"] = self.raw
        return d


# ---------------------------------------------------------------------------
# Provider metadata
# ---------------------------------------------------------------------------

SEARCH_PROVIDERS: dict[str, str] = {
    "duckduckgo": "Free web search via DuckDuckGo (no API key needed)",
    "jina": "Free-tier web reader/search via Jina AI",
    "tavily": "AI-optimized search API (paid, requires TAVILY_API_KEY)",
    "serpapi": "Google-results proxy (paid, requires SERPAPI_KEY)",
    "google_cse": "Google Custom Search Engine (paid, requires GOOGLE_API_KEY + GOOGLE_CSE_ID)",
    "scraper": "Direct web scraper using aiohttp + BeautifulSoup4 (free)",
    "gemini_grounding": "Search via Google Gemini grounding API (uses Gemini credits)",
}

FREE_PROVIDERS: set[str] = {"duckduckgo", "jina", "scraper"}

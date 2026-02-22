"""Source credibility hierarchy and classification."""

from __future__ import annotations

import re
from typing import Any

# Credibility scores (1-5) by source type.
HIERARCHY: dict[str, int] = {
    "peer_reviewed": 5,
    "government": 4,
    "news": 3,
    "blogs": 2,
    "social": 1,
    "forums": 1,
}

# URL patterns for source classification.
_URL_PATTERNS: list[tuple[str, str]] = [
    (r"\.gov(\.[a-z]{2})?(/|$)", "government"),
    (r"\.edu(/|$)", "peer_reviewed"),
    (r"pubmed\.ncbi|arxiv\.org|doi\.org|scholar\.google", "peer_reviewed"),
    (r"nature\.com|science\.org|springer\.com|wiley\.com", "peer_reviewed"),
    (r"lancet\.com|nejm\.org|bmj\.com|plos\.org", "peer_reviewed"),
    (r"reuters\.com|apnews\.com|bbc\.(com|co\.uk)", "news"),
    (r"nytimes\.com|washingtonpost\.com|theguardian\.com", "news"),
    (r"cnn\.com|npr\.org|aljazeera\.com", "news"),
    (r"medium\.com|substack\.com|wordpress\.com|blogspot", "blogs"),
    (r"twitter\.com|x\.com|facebook\.com|instagram\.com", "social"),
    (r"tiktok\.com|youtube\.com|reddit\.com", "social"),
    (r"reddit\.com/r/|stackexchange\.com|stackoverflow\.com", "forums"),
    (r"quora\.com|discourse\.|forum\.", "forums"),
]

# Title keywords that hint at source type.
_TITLE_KEYWORDS: dict[str, list[str]] = {
    "peer_reviewed": [
        "journal", "proceedings", "et al.", "doi:", "abstract",
        "peer-reviewed", "study", "meta-analysis",
    ],
    "government": [
        "department of", "ministry of", "official", "federal",
        "national institute", "census", "bureau of",
    ],
    "news": [
        "breaking", "reported", "correspondent", "editorial",
        "news", "press release",
    ],
    "blogs": ["blog", "opinion", "personal", "my thoughts"],
    "social": ["tweet", "post", "thread", "shared"],
    "forums": ["forum", "discussion", "q&a", "answered"],
}


def classify_source(url: str, title: str = "") -> str:
    """Classify a source into a hierarchy category.

    Uses URL pattern matching first, then falls back to title keyword
    analysis. Returns a key from HIERARCHY.
    """
    url_lower = url.lower() if url else ""
    title_lower = title.lower() if title else ""

    # Try URL pattern matching first (most reliable).
    for pattern, source_type in _URL_PATTERNS:
        if re.search(pattern, url_lower):
            return source_type

    # Fall back to title keyword analysis.
    best_type = "blogs"  # default to low credibility
    best_count = 0
    for source_type, keywords in _TITLE_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in title_lower)
        if count > best_count:
            best_count = count
            best_type = source_type

    return best_type


def rank_source(source: dict[str, Any]) -> int:
    """Return a credibility score (1-5) for a single source.

    The source dict should contain at least 'url'; optionally 'title'.
    """
    url = source.get("url", "")
    title = source.get("title", "")
    source_type = source.get("type") or classify_source(url, title)
    return HIERARCHY.get(source_type, 1)


def rank_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Score and sort sources by credibility (highest first).

    Each source dict is augmented with 'credibility_score' and
    'source_type' keys. The list is returned sorted descending.
    """
    scored: list[dict[str, Any]] = []
    for src in sources:
        entry = dict(src)
        url = entry.get("url", "")
        title = entry.get("title", "")
        entry["source_type"] = entry.get("type") or classify_source(
            url, title
        )
        entry["credibility_score"] = HIERARCHY.get(
            entry["source_type"], 1
        )
        scored.append(entry)

    scored.sort(key=lambda s: s["credibility_score"], reverse=True)
    return scored

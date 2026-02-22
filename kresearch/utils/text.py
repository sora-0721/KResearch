"""Text processing utilities for KResearch."""

from __future__ import annotations

import json
import re
import unicodedata
from difflib import SequenceMatcher


def truncate(text: str, max_len: int, suffix: str = "...") -> str:
    """Truncate text to *max_len* characters, appending *suffix* if trimmed."""
    if len(text) <= max_len:
        return text
    return text[: max_len - len(suffix)] + suffix


def count_tokens_approx(text: str) -> int:
    """Return a rough token-count estimate (approximately 1 token per 4 chars)."""
    return max(1, len(text) // 4)


def clean_json_response(text: str) -> str:
    """Strip markdown code fences (```json ... ```) from an LLM response.

    Returns the inner content with leading/trailing whitespace removed.
    """
    text = text.strip()
    # Remove opening fence with optional language tag
    text = re.sub(r"^```(?:json|JSON)?\s*\n?", "", text)
    # Remove closing fence
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def extract_json(text: str) -> dict:
    """Parse JSON from an LLM response, tolerating code fences.

    Tries direct parse first, then strips fences, then searches for the
    first ``{...}`` or ``[...]`` block in the text.

    Raises ``ValueError`` if no valid JSON can be extracted.
    """
    # Fast path: already valid JSON
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # Strip code fences and retry
    cleaned = clean_json_response(text)
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        pass

    # Search for first JSON object or array
    for pattern in (r"\{[\s\S]*\}", r"\[[\s\S]*\]"):
        match = re.search(pattern, cleaned)
        if match:
            try:
                return json.loads(match.group())
            except (json.JSONDecodeError, TypeError):
                continue

    raise ValueError(f"Could not extract JSON from text: {truncate(text, 120)}")


def slugify(text: str) -> str:
    """Convert *text* to a filesystem-safe slug.

    Normalises unicode, lowercases, replaces non-alphanumerics with hyphens,
    and collapses consecutive hyphens.
    """
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def _similarity(a: str, b: str) -> float:
    """Return the SequenceMatcher ratio between two strings."""
    return SequenceMatcher(None, a, b).ratio()


def deduplicate_texts(
    texts: list[str],
    threshold: float = 0.85,
) -> list[str]:
    """Remove near-duplicate strings, keeping the first occurrence.

    Two texts are considered duplicates when their similarity ratio
    (via ``difflib.SequenceMatcher``) meets or exceeds *threshold*.
    """
    unique: list[str] = []
    for text in texts:
        if not any(_similarity(text, u) >= threshold for u in unique):
            unique.append(text)
    return unique

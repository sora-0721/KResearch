"""Context compactor: deduplicates and summarises retrieved documents."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Rough estimate: 1 token ~ 4 characters.
_CHARS_PER_TOKEN = 4


async def compact_context(
    documents: list[dict],
    llm_provider: Any,
    max_tokens: int = 4000,
) -> str:
    """Produce a condensed summary of *documents* within *max_tokens*.

    Steps:
      1. Extract and deduplicate snippet text.
      2. Truncate the combined text to fit the token budget.
      3. Ask the LLM to produce a structured summary.

    Returns
    -------
    str
        A compacted summary string ready for use as downstream context.
    """
    if not documents:
        return ""

    snippets = _extract_unique_snippets(documents)
    if not snippets:
        return ""

    # Reserve roughly half the budget for the LLM's output.
    input_budget = (max_tokens // 2) * _CHARS_PER_TOKEN
    combined = _join_within_budget(snippets, input_budget)

    summary = await _llm_summarise(llm_provider, combined, max_tokens)
    return summary


# ------------------------------------------------------------------
# Deduplication
# ------------------------------------------------------------------

def _extract_unique_snippets(documents: list[dict]) -> list[str]:
    """Return deduplicated snippet texts, preserving insertion order."""
    seen: set[str] = set()
    unique: list[str] = []
    for doc in documents:
        text = doc.get("snippet", "").strip()
        if not text:
            continue
        key = _normalise_for_dedup(text)
        if key in seen:
            continue
        # Also skip near-duplicates by checking prefix overlap.
        if _is_near_duplicate(key, seen):
            continue
        seen.add(key)
        unique.append(text)
    return unique


def _normalise_for_dedup(text: str) -> str:
    """Lowercase, collapse whitespace for cheap dedup."""
    return " ".join(text.lower().split())


def _is_near_duplicate(
    candidate: str,
    existing: set[str],
    threshold: float = 0.85,
) -> bool:
    """Quick check: if candidate shares >=threshold of its words with
    any existing entry, treat it as a near-duplicate."""
    cand_words = set(candidate.split())
    if not cand_words:
        return False
    for entry in existing:
        entry_words = set(entry.split())
        if not entry_words:
            continue
        overlap = len(cand_words & entry_words)
        shorter = min(len(cand_words), len(entry_words))
        if shorter > 0 and (overlap / shorter) >= threshold:
            return True
    return False


# ------------------------------------------------------------------
# Budget-aware joining
# ------------------------------------------------------------------

def _join_within_budget(snippets: list[str], max_chars: int) -> str:
    """Concatenate snippets until *max_chars* is reached."""
    parts: list[str] = []
    total = 0
    for snippet in snippets:
        if total + len(snippet) > max_chars:
            remaining = max_chars - total
            if remaining > 50:
                parts.append(snippet[:remaining])
            break
        parts.append(snippet)
        total += len(snippet)
    return "\n---\n".join(parts)


# ------------------------------------------------------------------
# LLM summarisation
# ------------------------------------------------------------------

async def _llm_summarise(
    llm_provider: Any,
    combined_text: str,
    max_tokens: int,
) -> str:
    """Ask the LLM to condense *combined_text*."""
    messages = [
        {
            "role": "user",
            "content": (
                "Summarise the following retrieved research snippets into "
                "a structured, concise context document.  Preserve key "
                "facts, statistics, and source attributions.  Remove "
                "redundancy.\n\n"
                f"{combined_text}"
            ),
        },
    ]
    try:
        resp = await llm_provider.complete(
            messages=messages,
            temperature=0.2,
            max_tokens=max_tokens // 2,
        )
        return resp["content"]
    except Exception as exc:
        logger.warning("LLM summarisation failed: %s -- returning raw text", exc)
        # Graceful fallback: return truncated raw text.
        budget = max_tokens * _CHARS_PER_TOKEN
        return combined_text[:budget]

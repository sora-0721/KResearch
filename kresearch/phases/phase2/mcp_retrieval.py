"""MCP retrieval: optional local RAG store integration."""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


async def retrieve_from_rag(
    query: str,
    rag_retriever: Optional[Any] = None,
    max_results: int = 10,
) -> list[dict]:
    """Query a local ChromaDB RAG store and return results.

    Parameters
    ----------
    query:
        The search query string.
    rag_retriever:
        An object exposing an ``async query(query, n_results)`` method
        (e.g. a ChromaDB collection wrapper).  If *None* or not
        configured, the function returns an empty list.
    max_results:
        Maximum number of results to return.

    Returns
    -------
    list[dict]
        Each dict has keys: title, url, snippet, source.  This matches
        the format returned by web search providers so callers need no
        special handling.
    """
    if rag_retriever is None:
        logger.debug("RAG retriever not configured -- skipping.")
        return []

    try:
        raw = await _query_rag(rag_retriever, query, max_results)
        results = _normalise(raw)
        logger.info(
            "RAG retrieval returned %d results for '%s'",
            len(results),
            query,
        )
        return results
    except Exception as exc:
        logger.warning("RAG retrieval failed: %s -- returning []", exc)
        return []


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------

async def _query_rag(
    retriever: Any,
    query: str,
    n_results: int,
) -> list[dict]:
    """Call the retriever, handling both sync and async interfaces."""
    import asyncio

    if hasattr(retriever, "aquery"):
        return await retriever.aquery(query, n_results=n_results)
    if hasattr(retriever, "query"):
        result = retriever.query(query, n_results=n_results)
        # If the sync method accidentally returns a coroutine, await it.
        if asyncio.iscoroutine(result):
            result = await result
        return _unpack_chroma_result(result)
    raise TypeError(
        f"RAG retriever {type(retriever).__name__} has no query method."
    )


def _unpack_chroma_result(raw: Any) -> list[dict]:
    """Convert a ChromaDB query result dict to a flat list of docs."""
    if isinstance(raw, list):
        return raw
    # ChromaDB returns {"ids": [[...]], "documents": [[...]], ...}
    docs: list[dict] = []
    documents = raw.get("documents", [[]])[0]
    metadatas = raw.get("metadatas", [[]])[0]
    ids = raw.get("ids", [[]])[0]
    for i, text in enumerate(documents):
        meta = metadatas[i] if i < len(metadatas) else {}
        docs.append(
            {
                "id": ids[i] if i < len(ids) else "",
                "snippet": text,
                "title": meta.get("title", ""),
                "url": meta.get("url", ""),
                "source": "rag",
            }
        )
    return docs


def _normalise(raw: list[dict]) -> list[dict]:
    """Ensure every result dict has the expected keys."""
    return [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("source", "rag"),
        }
        for item in raw
    ]

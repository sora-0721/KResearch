"""RAGRetriever - High-level retrieval interface for RAG queries."""

from __future__ import annotations

import logging
from typing import Any

from kresearch.rag.store import RAGStore

logger = logging.getLogger(__name__)


class RAGRetriever:
    """High-level retrieval interface wrapping RAGStore.

    Provides async retrieval with structured result formatting.
    """

    def __init__(
        self,
        store: RAGStore | None = None,
        collection_name: str = "kresearch",
        persist_dir: str = "~/.kresearch/chromadb",
    ) -> None:
        """Initialize the retriever.

        Args:
            store: An existing RAGStore instance, or None to create one.
            collection_name: ChromaDB collection name (if creating store).
            persist_dir: Persistence directory (if creating store).
        """
        if store is not None:
            self._store = store
        else:
            self._store = RAGStore(
                collection_name=collection_name,
                persist_dir=persist_dir,
            )

    @property
    def store(self) -> RAGStore:
        """Return the underlying RAGStore."""
        return self._store

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant documents for a query.

        Args:
            query: The search query text.
            top_k: Maximum number of results to return.

        Returns:
            List of result dicts with keys:
                - content: The document text.
                - metadata: Associated metadata dict.
                - distance: Similarity distance (lower is better).
                - source: Source file path if available.
        """
        if not query or not query.strip():
            return []

        raw_results = self._store.query(query_text=query, n_results=top_k)

        results = []
        for item in raw_results:
            metadata = item.get("metadata", {})
            results.append({
                "content": item.get("content", ""),
                "metadata": metadata,
                "distance": item.get("distance", 1.0),
                "source": metadata.get("source", "unknown"),
            })

        logger.debug(
            "Retrieved %d results for query: %.50s...",
            len(results),
            query,
        )
        return results

    def is_available(self) -> bool:
        """Check whether the store has any documents indexed.

        Returns:
            True if the store contains at least one document.
        """
        try:
            return self._store.count() > 0
        except Exception:
            logger.debug("RAG store unavailable.", exc_info=True)
            return False

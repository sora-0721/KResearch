"""RAGStore - Vector storage backed by ChromaDB."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    import chromadb
    from chromadb.config import Settings

    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False


class RAGStore:
    """Vector store using ChromaDB for document storage and retrieval."""

    def __init__(
        self,
        collection_name: str = "kresearch",
        persist_dir: str = "~/.kresearch/chromadb",
    ) -> None:
        if not CHROMADB_AVAILABLE:
            raise ImportError(
                "ChromaDB is not installed. "
                "Install it with: pip install chromadb"
            )
        self.collection_name = collection_name
        self.persist_dir = Path(persist_dir).expanduser()
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        from kresearch.rag.embeddings import get_embedding_function

        self._embedding_fn = get_embedding_function()
        self._client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = self._get_or_create_collection()

    def _get_or_create_collection(self) -> Any:
        """Get existing collection or create a new one."""
        return self._client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=self._embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        docs: list[dict],
        ids: list[str],
    ) -> None:
        """Add documents to the vector store.

        Args:
            docs: List of dicts with 'content' and optional 'metadata' keys.
            ids: Unique identifiers for each document.
        """
        if not docs:
            return

        documents = [d["content"] for d in docs]
        metadatas = [d.get("metadata", {}) for d in docs]

        # ChromaDB requires metadata values to be str, int, float, or bool
        clean_metadatas = []
        for meta in metadatas:
            clean = {}
            for k, v in meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean[k] = v
                else:
                    clean[k] = str(v)
            clean_metadatas.append(clean)

        self._collection.add(
            documents=documents,
            metadatas=clean_metadatas,
            ids=ids,
        )
        logger.info("Added %d documents to store.", len(docs))

    def query(
        self,
        query_text: str,
        n_results: int = 5,
    ) -> list[dict]:
        """Query the vector store for similar documents.

        Returns:
            List of dicts with 'content', 'metadata', and 'distance' keys.
        """
        count = self._collection.count()
        if count == 0:
            return []

        actual_n = min(n_results, count)
        results = self._collection.query(
            query_texts=[query_text],
            n_results=actual_n,
        )

        output = []
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(documents, metadatas, distances):
            output.append({
                "content": doc,
                "metadata": meta or {},
                "distance": dist,
            })
        return output

    def delete_collection(self) -> None:
        """Delete the entire collection."""
        self._client.delete_collection(self.collection_name)
        self._collection = self._get_or_create_collection()
        logger.info("Deleted and recreated collection '%s'.", self.collection_name)

    def count(self) -> int:
        """Return the number of documents in the store."""
        return self._collection.count()

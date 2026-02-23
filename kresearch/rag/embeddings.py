"""Embedding functions for the RAG module."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "all-MiniLM-L6-v2"


def get_embedding_function() -> Any:
    """Return a ChromaDB-compatible embedding function.

    Tries sentence-transformers first, falls back to ChromaDB's
    default embedding function.

    Returns:
        A ChromaDB embedding function instance.
    """
    try:
        return _get_sentence_transformer_ef()
    except (ImportError, Exception) as exc:
        logger.info(
            "sentence-transformers not available (%s), "
            "using ChromaDB default embedding.",
            exc,
        )
        return _get_default_ef()


def _get_sentence_transformer_ef() -> Any:
    """Build a sentence-transformers embedding function for ChromaDB."""
    from chromadb.utils.embedding_functions import (
        SentenceTransformerEmbeddingFunction,
    )

    logger.debug("Using sentence-transformers model '%s'.", DEFAULT_MODEL)
    return SentenceTransformerEmbeddingFunction(model_name=DEFAULT_MODEL)


def _get_default_ef() -> Any:
    """Return ChromaDB's built-in default embedding function."""
    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

    logger.debug("Using ChromaDB default embedding function.")
    return DefaultEmbeddingFunction()

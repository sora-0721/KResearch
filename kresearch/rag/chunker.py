"""Text chunking utilities for RAG ingestion."""

from __future__ import annotations

import re
import uuid


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[str]:
    """Split text into overlapping chunks using smart splitting.

    Strategy: split by paragraphs first, then sentences, then words.

    Args:
        text: The text to chunk.
        chunk_size: Maximum characters per chunk.
        overlap: Number of overlapping characters between chunks.

    Returns:
        List of text chunks.
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    if len(text) <= chunk_size:
        return [text]

    # Try paragraph-level splitting first
    paragraphs = re.split(r"\n\s*\n", text)
    if len(paragraphs) > 1:
        return _merge_splits(paragraphs, chunk_size, overlap)

    # Fall back to sentence-level splitting
    sentences = re.split(r"(?<=[.!?])\s+", text)
    if len(sentences) > 1:
        return _merge_splits(sentences, chunk_size, overlap)

    # Last resort: word-level splitting
    words = text.split()
    return _merge_splits(words, chunk_size, overlap, join_char=" ")


def _merge_splits(
    splits: list[str],
    chunk_size: int,
    overlap: int,
    join_char: str = "\n\n",
) -> list[str]:
    """Merge small splits into chunks respecting size and overlap."""
    chunks: list[str] = []
    current_parts: list[str] = []
    current_len = 0

    for part in splits:
        part_len = len(part)
        separator_len = len(join_char) if current_parts else 0

        if current_len + separator_len + part_len > chunk_size and current_parts:
            chunk_text_str = join_char.join(current_parts)
            chunks.append(chunk_text_str)

            # Build overlap from the tail of current_parts
            overlap_parts: list[str] = []
            overlap_len = 0
            for p in reversed(current_parts):
                if overlap_len + len(p) > overlap:
                    break
                overlap_parts.insert(0, p)
                overlap_len += len(p) + len(join_char)

            current_parts = overlap_parts
            current_len = sum(len(p) for p in current_parts) + max(
                0, (len(current_parts) - 1) * len(join_char)
            )

        current_parts.append(part)
        current_len += separator_len + part_len

    if current_parts:
        chunks.append(join_char.join(current_parts))

    return chunks


def chunk_document(doc: dict) -> list[dict]:
    """Chunk a document dict and attach metadata to each chunk.

    Args:
        doc: Dict with 'content' key and optional 'metadata'.

    Returns:
        List of dicts, each with 'content', 'metadata', and 'id'.
    """
    content = doc.get("content", "")
    base_metadata = doc.get("metadata", {})
    source = base_metadata.get("source", "unknown")

    chunks = chunk_text(content)
    result = []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{source}::chunk_{i}::{uuid.uuid4().hex[:8]}"
        meta = {
            **base_metadata,
            "chunk_index": i,
            "total_chunks": len(chunks),
        }
        result.append({
            "content": chunk,
            "metadata": meta,
            "id": chunk_id,
        })
    return result

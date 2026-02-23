"""Document ingestion for the RAG store."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING

from kresearch.rag.chunker import chunk_document

if TYPE_CHECKING:
    from kresearch.rag.store import RAGStore

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".json"}


async def ingest_file(file_path: Path, store: RAGStore) -> int:
    """Ingest a single file into the RAG store.

    Args:
        file_path: Path to the file to ingest.
        store: The RAGStore instance.

    Returns:
        Number of chunks added.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        logger.warning("File not found: %s", file_path)
        return 0

    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        logger.warning("Unsupported file type: %s", ext)
        return 0

    content = _read_file(file_path)
    if not content or not content.strip():
        logger.warning("Empty or unreadable file: %s", file_path)
        return 0

    doc = {
        "content": content,
        "metadata": {
            "source": str(file_path),
            "filename": file_path.name,
            "extension": ext,
        },
    }

    chunks = chunk_document(doc)
    if not chunks:
        return 0

    docs = [{"content": c["content"], "metadata": c["metadata"]} for c in chunks]
    ids = [c["id"] for c in chunks]

    store.add_documents(docs, ids)
    logger.info("Ingested %d chunks from %s", len(chunks), file_path.name)
    return len(chunks)


async def ingest_directory(dir_path: Path, store: RAGStore) -> int:
    """Ingest all supported files from a directory.

    Args:
        dir_path: Path to the directory.
        store: The RAGStore instance.

    Returns:
        Total number of chunks added.
    """
    dir_path = Path(dir_path)
    if not dir_path.is_dir():
        logger.warning("Directory not found: %s", dir_path)
        return 0

    total = 0
    for ext in SUPPORTED_EXTENSIONS:
        for file_path in sorted(dir_path.rglob(f"*{ext}")):
            if file_path.is_file():
                count = await ingest_file(file_path, store)
                total += count

    logger.info("Ingested %d total chunks from %s", total, dir_path)
    return total


def _read_file(file_path: Path) -> str:
    """Read file contents based on extension."""
    ext = file_path.suffix.lower()

    if ext == ".json":
        return _read_json(file_path)
    if ext == ".pdf":
        return _read_pdf(file_path)
    # .txt, .md
    return file_path.read_text(encoding="utf-8", errors="replace")


def _read_json(file_path: Path) -> str:
    """Read and flatten a JSON file to text."""
    raw = file_path.read_text(encoding="utf-8", errors="replace")
    try:
        data = json.loads(raw)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except json.JSONDecodeError:
        return raw


def _read_pdf(file_path: Path) -> str:
    """Extract text from a PDF (text-layer only)."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(str(file_path))
        pages = [page.get_text() for page in doc]
        doc.close()
        return "\n\n".join(pages)
    except ImportError:
        logger.warning(
            "PyMuPDF not installed; cannot read PDF %s. "
            "Install with: pip install pymupdf",
            file_path.name,
        )
        return ""

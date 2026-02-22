"""Markdown exporter for KResearch reports."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from kresearch.export.base import Exporter

if TYPE_CHECKING:
    from kresearch.core.session import ResearchSession


class MarkdownExporter(Exporter):
    """Export a research report as a Markdown file."""

    @property
    def format_name(self) -> str:
        return "markdown"

    async def export(
        self,
        content: str,
        session: ResearchSession,
        path: Path,
    ) -> Path:
        """Write the report to *path* with metadata header and TOC."""
        path.parent.mkdir(parents=True, exist_ok=True)

        header = _build_metadata_header(session)
        toc = _build_toc(content)
        bibliography = _extract_bibliography(content)

        parts = [header, toc, content]
        if bibliography:
            parts.append(bibliography)

        path.write_text("\n\n".join(parts), encoding="utf-8")
        return path


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def _build_metadata_header(session: ResearchSession) -> str:
    """Return a YAML-style metadata block."""
    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    lines = [
        "---",
        f"title: \"{session.original_query}\"",
        f"session_id: {session.id}",
        f"created_at: {session.created_at.isoformat()}",
        f"exported_at: {now}",
        f"phase: {session.phase_name}",
        f"status: {session.status}",
        "---",
    ]
    return "\n".join(lines)


def _build_toc(content: str) -> str:
    """Generate a table of contents from markdown headings."""
    entries: list[str] = []
    for match in _HEADING_RE.finditer(content):
        level = len(match.group(1))
        title = match.group(2).strip()
        anchor = _slugify_heading(title)
        indent = "  " * (level - 1)
        entries.append(f"{indent}- [{title}](#{anchor})")

    if not entries:
        return ""

    return "## Table of Contents\n\n" + "\n".join(entries)


def _slugify_heading(text: str) -> str:
    """Convert a heading to a GitHub-compatible anchor slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    return slug


_URL_RE = re.compile(r"https?://\S+")


def _extract_bibliography(content: str) -> str:
    """Extract unique URLs from content into a bibliography section."""
    urls = list(dict.fromkeys(_URL_RE.findall(content)))
    if not urls:
        return ""

    lines = ["## Bibliography", ""]
    for i, url in enumerate(urls, 1):
        clean = url.rstrip(".,;:)")
        lines.append(f"{i}. <{clean}>")

    return "\n".join(lines)

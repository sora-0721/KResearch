"""Finalizer: compiles the polished draft into a complete markdown report."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from kresearch.core.mind_map import EpistemicMindMap
from kresearch.core.session import ResearchSession

logger = logging.getLogger(__name__)


def _collect_sources(mind_map: EpistemicMindMap) -> list[str]:
    """Gather all unique sources from mind-map nodes, preserving order."""
    seen: set[str] = set()
    sources: list[str] = []
    data = mind_map.to_dict()
    for node_data in data.get("nodes", {}).values():
        for src in node_data.get("sources", []):
            if src and src not in seen:
                seen.add(src)
                sources.append(src)
    return sources


def _build_bibliography(sources: list[str]) -> str:
    """Format sources into a numbered bibliography section."""
    if not sources:
        return "## Bibliography\n\nNo sources available.\n"
    lines = ["## Bibliography\n"]
    for idx, src in enumerate(sources, 1):
        lines.append(f"[{idx}] {src}")
    return "\n".join(lines) + "\n"


def _build_metadata_header(
    session: ResearchSession,
    model_name: str,
) -> str:
    """Create a metadata header block for the report."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    phases_done = session.current_phase
    lines = [
        "---",
        f"query: \"{session.original_query}\"",
        f"date: {now}",
        f"phases_completed: {phases_done}",
        f"model: {model_name}",
        f"session_id: {session.id}",
        "---",
        "",
    ]
    return "\n".join(lines)


def _renumber_citations(draft: str, sources: list[str]) -> str:
    """Ensure citation markers [1], [2], ... are consistent.

    Replaces any existing bracketed source references with numbered
    markers matching their position in the bibliography.
    """
    text = draft
    for idx, src in enumerate(sources, 1):
        # Replace full source text in brackets with numbered reference
        text = text.replace(f"[{src}]", f"[{idx}]")
    return text


async def finalize_report(
    draft: str,
    mind_map: EpistemicMindMap,
    session: ResearchSession,
    llm_provider: Any,
) -> str:
    """Compile the final markdown report from the polished draft.

    Adds metadata header, renumbers citations, appends bibliography,
    and publishes the export event.
    """
    model_name = getattr(llm_provider, "name", "unknown")
    sources = _collect_sources(mind_map)

    # Build report parts
    header = _build_metadata_header(session, model_name)
    body = _renumber_citations(draft, sources)
    bibliography = _build_bibliography(sources)

    # Assemble final report
    report = f"{header}{body}\n\n{bibliography}"

    logger.info(
        "Finalized report: %d characters, %d sources",
        len(report),
        len(sources),
    )
    return report

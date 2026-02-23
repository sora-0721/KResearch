"""Message formatting utilities for Telegram output."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from kresearch.core.session import ResearchSession

# Characters that Telegram MarkdownV2 requires to be escaped.
_MD_SPECIAL = r"_*[]()~`>#+-=|{}.!"


def escape_markdown(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2 format."""
    return re.sub(r"([%s])" % re.escape(_MD_SPECIAL), r"\\\1", text)


# ------------------------------------------------------------------
# Phase updates
# ------------------------------------------------------------------

def format_phase_update(phase_num: int, phase_name: str, status: str) -> str:
    """Format a phase status change for Telegram.

    Returns MarkdownV2-safe text.
    """
    icon = {
        "started": ">>",
        "completed": "[OK]",
        "failed": "[FAIL]",
    }.get(status, "[-]")

    raw = f"{icon} Phase {phase_num}: {phase_name} — {status}"
    return escape_markdown(raw)


# ------------------------------------------------------------------
# Session progress
# ------------------------------------------------------------------

def format_progress(session: "ResearchSession") -> str:
    """Build a concise progress summary from a *ResearchSession*.

    Returns MarkdownV2-safe text.
    """
    summary = session.get_summary()
    lines = [
        f"*Research Status*",
        "",
        f"Query: {escape_markdown(summary['query'])}",
        f"Phase: {escape_markdown(summary['phase'])} "
        f"\\({summary['phase_index']}\\)",
        f"Status: {escape_markdown(summary['status'])}",
        f"Documents: {summary['documents_retrieved']}",
        f"Verifications: {summary['verifications']}",
        f"Conflicts: {summary['conflicts_found']}",
        f"Drafts: {summary['drafts']}",
        f"Final report: {'yes' if summary['has_final_report'] else 'no'}",
    ]
    return "\n".join(lines)


# ------------------------------------------------------------------
# Report summary
# ------------------------------------------------------------------

def format_report_summary(report: str, max_length: int = 4000) -> str:
    """Truncate and format the final report for Telegram.

    Telegram messages have a ~4096-character limit.  We leave a small
    margin for the wrapper text.

    Returns MarkdownV2-safe text.
    """
    truncated = report[:max_length]
    if len(report) > max_length:
        truncated += "\n\n... (truncated)"

    header = "*Research Report*\n\n"
    return header + escape_markdown(truncated)


# ------------------------------------------------------------------
# Error formatting
# ------------------------------------------------------------------

def format_error(error: str) -> str:
    """Format an error message for Telegram.

    Returns MarkdownV2-safe text.
    """
    return escape_markdown(f"[ERROR] {error}")

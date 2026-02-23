"""ExportManager - orchestrates exporting to various formats."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from kresearch.export.json_exporter import JSONExporter
from kresearch.export.markdown_exporter import MarkdownExporter
from kresearch.utils.text import slugify

if TYPE_CHECKING:
    from kresearch.core.session import ResearchSession

from kresearch.export.base import Exporter

_FORMAT_EXTENSIONS: dict[str, str] = {
    "markdown": ".md",
    "json": ".json",
}


class ExportManager:
    """Central manager for exporting research sessions."""

    def __init__(self, output_dir: Path | None = None) -> None:
        self._output_dir = output_dir or Path("output")
        self._exporters: dict[str, Exporter] = {}
        self._register_defaults()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def register_exporter(self, exporter: Exporter) -> None:
        """Register a custom exporter."""
        self._exporters[exporter.format_name] = exporter

    async def export(
        self,
        format_name: str,
        content: str,
        session: ResearchSession,
        path: Path | None = None,
    ) -> Path:
        """Export *content* in the specified format.

        Args:
            format_name: Export format (e.g. ``"markdown"``, ``"json"``).
            content: The report text to export.
            session: The research session providing metadata.
            path: Optional destination path. If ``None``, a default
                  path is generated inside the output directory.

        Returns:
            The final file path of the exported artifact.

        Raises:
            KeyError: If the requested format is not registered.
        """
        exporter = self._exporters.get(format_name)
        if exporter is None:
            available = ", ".join(sorted(self._exporters.keys()))
            raise KeyError(
                f"Unknown export format '{format_name}'. "
                f"Available: {available}"
            )

        if path is None:
            path = self.get_default_path(
                format_name, session.original_query
            )

        return await exporter.export(content, session, path)

    def get_default_path(self, format_name: str, query: str) -> Path:
        """Build a default output path from the query text.

        The filename is constructed as ``<date>_<slug><ext>`` inside
        the configured output directory.
        """
        ext = _FORMAT_EXTENSIONS.get(format_name, f".{format_name}")
        slug = slugify(query)[:60] if query else "report"
        date_prefix = datetime.utcnow().strftime("%Y%m%d")
        filename = f"{date_prefix}_{slug}{ext}"
        return self._output_dir / filename

    @property
    def supported_formats(self) -> list[str]:
        """Return the names of all registered export formats."""
        return sorted(self._exporters.keys())

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _register_defaults(self) -> None:
        """Register the built-in exporters."""
        self._exporters["markdown"] = MarkdownExporter()
        self._exporters["json"] = JSONExporter()

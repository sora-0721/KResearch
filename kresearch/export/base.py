"""Abstract base class for export formatters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from kresearch.core.session import ResearchSession


class Exporter(ABC):
    """Base class that all export formatters must implement."""

    @property
    @abstractmethod
    def format_name(self) -> str:
        """Return the canonical name for this export format."""
        ...

    @abstractmethod
    async def export(
        self,
        content: str,
        session: ResearchSession,
        path: Path,
    ) -> Path:
        """Export content to the given path.

        Args:
            content: The report text to export.
            session: The research session providing metadata.
            path: Destination file path.

        Returns:
            The final path of the exported file.
        """
        ...

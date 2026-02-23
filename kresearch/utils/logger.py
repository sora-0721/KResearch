"""Logging setup for KResearch.

Uses ``rich.logging.RichHandler`` when available for pretty, coloured
console output.  Falls back to a plain ``StreamHandler`` otherwise.
"""

from __future__ import annotations

import logging
import os
from typing import Dict

_loggers: Dict[str, logging.Logger] = {}

# Read default level from environment, defaulting to WARNING.
_DEFAULT_LEVEL = os.environ.get("LOG_LEVEL", "WARNING").upper()


def _make_handler() -> logging.Handler:
    """Create a console handler, preferring RichHandler if available."""
    try:
        from rich.logging import RichHandler  # type: ignore[import-untyped]

        handler = RichHandler(
            rich_tracebacks=True,
            show_time=True,
            show_path=True,
            markup=True,
        )
    except ImportError:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
    return handler


def setup_logger(
    name: str,
    level: str | int | None = None,
) -> logging.Logger:
    """Create (or reconfigure) a named logger.

    Parameters
    ----------
    name:
        Logger name, typically ``__name__`` of the calling module.
    level:
        Logging level as a string (``"DEBUG"``, ``"INFO"``, ...) or an
        ``int`` constant.  Defaults to the ``LOG_LEVEL`` env-var, or
        ``WARNING`` if unset.

    Returns
    -------
    logging.Logger
    """
    resolved_level: int
    if level is None:
        resolved_level = getattr(logging, _DEFAULT_LEVEL, logging.WARNING)
    elif isinstance(level, str):
        resolved_level = getattr(logging, level.upper(), logging.WARNING)
    else:
        resolved_level = level

    logger = logging.getLogger(name)
    logger.setLevel(resolved_level)

    # Avoid adding duplicate handlers on repeated calls.
    if not logger.handlers:
        logger.addHandler(_make_handler())

    logger.propagate = False

    # Cache for get_logger lookups
    _loggers[name] = logger
    return logger


def get_logger(name: str) -> logging.Logger:
    """Return a cached logger, creating one if needed.

    This is the recommended entry point for most modules::

        from kresearch.utils.logger import get_logger
        logger = get_logger(__name__)
    """
    if name not in _loggers:
        setup_logger(name)
    return _loggers[name]

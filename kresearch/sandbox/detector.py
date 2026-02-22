"""Auto-detection of available sandbox environments."""

from __future__ import annotations

import asyncio
import logging
import shutil

logger = logging.getLogger(__name__)


async def detect_sandbox_type() -> str:
    """Detect the best available sandbox type.

    Checks if Docker is available and running. Returns "docker" if so,
    otherwise falls back to "subprocess".

    Returns:
        "docker" or "subprocess".
    """
    if await _is_docker_available():
        logger.info("Docker detected and running; using docker sandbox.")
        return "docker"

    logger.info("Docker not available; using subprocess sandbox.")
    return "subprocess"


async def _is_docker_available() -> bool:
    """Check whether the Docker daemon is reachable."""
    docker_path = shutil.which("docker")
    if docker_path is None:
        logger.debug("Docker CLI not found on PATH.")
        return False

    try:
        proc = await asyncio.create_subprocess_exec(
            "docker", "info",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        return_code = await asyncio.wait_for(proc.wait(), timeout=10)
        return return_code == 0
    except asyncio.TimeoutError:
        logger.debug("Docker info timed out.")
        return False
    except OSError as exc:
        logger.debug("Docker check failed: %s", exc)
        return False

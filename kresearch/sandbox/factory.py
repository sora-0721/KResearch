"""Sandbox factory - creates the appropriate sandbox based on environment."""

from __future__ import annotations

import logging
from typing import Any

from kresearch.sandbox.base import Sandbox
from kresearch.sandbox.detector import detect_sandbox_type

logger = logging.getLogger(__name__)


async def create_sandbox(config: Any = None) -> Sandbox:
    """Create and return the best available sandbox.

    Uses auto-detection to choose between Docker and subprocess sandboxes.
    Respects configuration if provided.

    Args:
        config: Optional config object. If it has a
                ``sandbox.prefer_docker`` attribute, that preference
                is honored.

    Returns:
        A ready-to-use Sandbox instance.
    """
    prefer_docker = _get_prefer_docker(config)

    if prefer_docker is not None:
        if prefer_docker:
            logger.info("Config prefers Docker sandbox.")
            return _make_docker_sandbox()
        else:
            logger.info("Config prefers subprocess sandbox.")
            return _make_subprocess_sandbox()

    # Auto-detect
    sandbox_type = await detect_sandbox_type()

    if sandbox_type == "docker":
        return _make_docker_sandbox()
    return _make_subprocess_sandbox()


def _get_prefer_docker(config: Any) -> bool | None:
    """Extract prefer_docker setting from config, if available."""
    if config is None:
        return None

    # Support config.sandbox.prefer_docker
    sandbox_cfg = getattr(config, "sandbox", None)
    if sandbox_cfg is not None:
        val = getattr(sandbox_cfg, "prefer_docker", None)
        if val is not None:
            return bool(val)

    # Support dict-style config
    if isinstance(config, dict):
        sandbox_dict = config.get("sandbox", {})
        if isinstance(sandbox_dict, dict):
            val = sandbox_dict.get("prefer_docker")
            if val is not None:
                return bool(val)

    return None


def _make_docker_sandbox() -> Sandbox:
    """Create a DockerSandbox instance."""
    from kresearch.sandbox.docker_sandbox import DockerSandbox

    sandbox = DockerSandbox()
    if sandbox.is_available:
        return sandbox

    logger.warning("Docker requested but unavailable; falling back to subprocess.")
    return _make_subprocess_sandbox()


def _make_subprocess_sandbox() -> Sandbox:
    """Create a SubprocessSandbox instance."""
    from kresearch.sandbox.subprocess_sandbox import SubprocessSandbox

    return SubprocessSandbox()

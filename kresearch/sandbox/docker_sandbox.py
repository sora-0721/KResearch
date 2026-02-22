"""Docker-based sandbox for isolated code execution."""

from __future__ import annotations

import logging

from kresearch.sandbox.base import ExecutionResult, Sandbox

logger = logging.getLogger(__name__)

DEFAULT_IMAGE = "python:3.11-slim"
CONTAINER_TIMEOUT_EXTRA = 5  # extra seconds before force-killing container


class DockerSandbox(Sandbox):
    """Sandbox that runs code inside a Docker container.

    Provides strong isolation: no volume mounts, restricted networking.
    Falls back to SubprocessSandbox if Docker SDK is unavailable.
    """

    def __init__(self, image: str = DEFAULT_IMAGE) -> None:
        self.image = image
        self._client = None
        self._init_docker()

    def _init_docker(self) -> None:
        """Initialize Docker client, or log a warning on failure."""
        try:
            import docker

            self._client = docker.from_env()
            self._client.ping()
            logger.debug("Docker client connected.")
        except ImportError:
            logger.warning(
                "docker SDK not installed. "
                "Install with: pip install docker"
            )
            self._client = None
        except Exception as exc:
            logger.warning("Docker unavailable: %s", exc)
            self._client = None

    @property
    def is_available(self) -> bool:
        """Return True if Docker client is connected."""
        return self._client is not None

    async def execute_python(
        self,
        code: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """Execute Python code inside a Docker container."""
        if not self.is_available:
            return await self._fallback_python(code, timeout)

        cmd = ["python", "-c", code]
        return self._run_container(cmd, timeout)

    async def execute_shell(
        self,
        cmd: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """Execute a shell command inside a Docker container."""
        if not self.is_available:
            return await self._fallback_shell(cmd, timeout)

        return self._run_container(["sh", "-c", cmd], timeout)

    def _run_container(
        self,
        cmd: list[str],
        timeout: int,
    ) -> ExecutionResult:
        """Run a command in an ephemeral container."""
        container = None
        try:
            container = self._client.containers.run(
                self.image,
                command=cmd,
                detach=True,
                network_disabled=True,
                mem_limit="256m",
                cpu_period=100000,
                cpu_quota=50000,
            )

            result = container.wait(timeout=timeout + CONTAINER_TIMEOUT_EXTRA)
            stdout = container.logs(stdout=True, stderr=False).decode(
                "utf-8", errors="replace"
            )
            stderr = container.logs(stdout=False, stderr=True).decode(
                "utf-8", errors="replace"
            )

            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                return_code=result.get("StatusCode", -1),
            )
        except Exception as exc:
            exc_str = str(exc)
            timed_out = "timed out" in exc_str.lower() or "read timed out" in exc_str.lower()
            if timed_out and container:
                try:
                    container.stop(timeout=2)
                except Exception:
                    pass
            return ExecutionResult(
                stderr=exc_str,
                return_code=-1,
                timed_out=timed_out,
                error=None if timed_out else exc_str,
            )
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass

    async def _fallback_python(self, code: str, timeout: int) -> ExecutionResult:
        """Fall back to subprocess sandbox for Python execution."""
        logger.info("Docker unavailable, falling back to subprocess.")
        from kresearch.sandbox.subprocess_sandbox import SubprocessSandbox

        sb = SubprocessSandbox()
        return await sb.execute_python(code, timeout)

    async def _fallback_shell(self, cmd: str, timeout: int) -> ExecutionResult:
        """Fall back to subprocess sandbox for shell execution."""
        logger.info("Docker unavailable, falling back to subprocess.")
        from kresearch.sandbox.subprocess_sandbox import SubprocessSandbox

        sb = SubprocessSandbox()
        return await sb.execute_shell(cmd, timeout)

    async def cleanup(self) -> None:
        """Close the Docker client if open."""
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None

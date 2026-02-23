"""Subprocess-based sandbox for code execution."""

from __future__ import annotations

import asyncio
import logging
import sys
import tempfile
from pathlib import Path

from kresearch.sandbox.base import ExecutionResult, Sandbox

logger = logging.getLogger(__name__)


class SubprocessSandbox(Sandbox):
    """Sandbox that runs code in local subprocesses.

    This provides basic isolation via separate processes but does NOT
    provide filesystem or network isolation. Use DockerSandbox for
    stronger isolation.
    """

    async def execute_python(
        self,
        code: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """Execute Python code in a subprocess.

        Writes code to a temp file, then runs it with the current
        Python interpreter.
        """
        tmp = None
        try:
            tmp = tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".py",
                delete=False,
                encoding="utf-8",
            )
            tmp.write(code)
            tmp.flush()
            tmp.close()

            return await self._run_process(
                [sys.executable, tmp.name],
                timeout=timeout,
            )
        except Exception as exc:
            return ExecutionResult(error=str(exc), return_code=-1)
        finally:
            if tmp is not None:
                try:
                    Path(tmp.name).unlink(missing_ok=True)
                except OSError:
                    pass

    async def execute_shell(
        self,
        cmd: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """Execute a shell command in a subprocess."""
        try:
            return await self._run_process(
                ["sh", "-c", cmd],
                timeout=timeout,
            )
        except Exception as exc:
            return ExecutionResult(error=str(exc), return_code=-1)

    async def _run_process(
        self,
        args: list[str],
        timeout: int,
    ) -> ExecutionResult:
        """Run a subprocess with timeout handling."""
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout,
            )
            return ExecutionResult(
                stdout=stdout_bytes.decode("utf-8", errors="replace"),
                stderr=stderr_bytes.decode("utf-8", errors="replace"),
                return_code=proc.returncode or 0,
            )
        except asyncio.TimeoutError:
            logger.warning("Process timed out after %ds, killing.", timeout)
            try:
                proc.kill()
                await proc.wait()
            except ProcessLookupError:
                pass
            return ExecutionResult(
                stderr=f"Process timed out after {timeout}s",
                return_code=-1,
                timed_out=True,
            )

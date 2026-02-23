"""Abstract base class for sandbox execution environments."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ExecutionResult:
    """Result of a sandboxed code execution.

    Attributes:
        stdout: Standard output captured from execution.
        stderr: Standard error captured from execution.
        return_code: Process exit code (0 = success).
        timed_out: Whether the execution was killed due to timeout.
        error: Optional error message if execution failed to start.
    """

    stdout: str = ""
    stderr: str = ""
    return_code: int = 0
    timed_out: bool = False
    error: str | None = None

    @property
    def success(self) -> bool:
        """Return True if execution succeeded without errors."""
        return self.return_code == 0 and not self.timed_out and self.error is None


class Sandbox(ABC):
    """Abstract base class for sandboxed code execution.

    Subclasses must implement execute_python and execute_shell to provide
    isolated environments for running untrusted code.
    """

    @abstractmethod
    async def execute_python(
        self,
        code: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """Execute Python code in the sandbox.

        Args:
            code: Python source code to execute.
            timeout: Maximum execution time in seconds.

        Returns:
            ExecutionResult with captured output.
        """

    @abstractmethod
    async def execute_shell(
        self,
        cmd: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """Execute a shell command in the sandbox.

        Args:
            cmd: Shell command string to execute.
            timeout: Maximum execution time in seconds.

        Returns:
            ExecutionResult with captured output.
        """

    async def cleanup(self) -> None:
        """Clean up sandbox resources. Override if needed."""

    async def __aenter__(self) -> Sandbox:
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.cleanup()

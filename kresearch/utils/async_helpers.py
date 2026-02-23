"""Async helper utilities for KResearch."""

from __future__ import annotations

import asyncio
import functools
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Coroutine, Sequence

# Shared thread-pool for run_sync; lazily created.
_executor: ThreadPoolExecutor | None = None


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(max_workers=8)
    return _executor


async def gather_with_limit(
    coros: Sequence[Coroutine],
    limit: int,
) -> list[Any]:
    """Run coroutines concurrently, capping parallelism to *limit*.

    Uses an ``asyncio.Semaphore`` to ensure at most *limit* coroutines
    execute at the same time.  Results are returned in the same order as
    the input coroutines.
    """
    semaphore = asyncio.Semaphore(limit)

    async def _wrap(coro: Coroutine) -> Any:
        async with semaphore:
            return await coro

    return await asyncio.gather(*(_wrap(c) for c in coros))


async def run_sync(func: Callable, *args: Any) -> Any:
    """Run a synchronous *func* in a thread-pool executor.

    This keeps the event loop responsive while blocking I/O or CPU-bound
    work executes in a separate thread.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _get_executor(),
        functools.partial(func, *args),
    )


async def timeout_wrap(
    coro: Coroutine,
    seconds: float,
) -> Any:
    """Wrap *coro* with a timeout.

    Raises ``asyncio.TimeoutError`` if the coroutine does not complete
    within *seconds*.
    """
    return await asyncio.wait_for(coro, timeout=seconds)


def create_semaphore_map(
    limits: dict[str, int],
) -> dict[str, asyncio.Semaphore]:
    """Create a mapping of named ``asyncio.Semaphore`` instances.

    Parameters
    ----------
    limits:
        A dict mapping label -> max concurrency.  For example::

            {"openai": 5, "semantic_scholar": 2}

    Returns
    -------
    dict[str, asyncio.Semaphore]
    """
    return {name: asyncio.Semaphore(value) for name, value in limits.items()}

"""Retry logic with exponential back-off for KResearch."""

from __future__ import annotations

import asyncio
import functools
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine, TypeVar

logger = logging.getLogger(__name__)
T = TypeVar("T")

# Exceptions that should never be retried.
_FATAL = (KeyboardInterrupt, SystemExit, GeneratorExit)


@dataclass
class RetryConfig:
    """Configuration for retry behaviour."""

    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    exponential: bool = True
    retryable_exceptions: tuple[type[BaseException], ...] = field(
        default_factory=lambda: (Exception,),
    )

    def delay_for(self, attempt: int) -> float:
        """Return the delay (in seconds) for the given *attempt* number."""
        if self.exponential:
            delay = self.base_delay * (2 ** attempt)
        else:
            delay = self.base_delay
        return min(delay, self.max_delay)


async def retry(
    func: Callable[..., Coroutine],
    *args: Any,
    config: RetryConfig | None = None,
    on_retry: Callable[[int, BaseException], Any] | None = None,
    **kwargs: Any,
) -> Any:
    """Call an async *func* with automatic retries.

    Parameters
    ----------
    func:
        An async callable to invoke.
    config:
        Retry settings.  Uses ``RetryConfig()`` defaults when *None*.
    on_retry:
        Optional callback ``(attempt, exception)`` invoked before each retry.
    """
    cfg = config or RetryConfig()
    last_exc: BaseException | None = None

    for attempt in range(cfg.max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except _FATAL:
            raise
        except cfg.retryable_exceptions as exc:
            last_exc = exc
            if attempt >= cfg.max_retries:
                break
            delay = cfg.delay_for(attempt)
            logger.warning(
                "Retry %d/%d after %.1fs – %s: %s",
                attempt + 1,
                cfg.max_retries,
                delay,
                type(exc).__name__,
                exc,
            )
            if on_retry is not None:
                on_retry(attempt + 1, exc)
            await asyncio.sleep(delay)

    raise last_exc  # type: ignore[misc]


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential: bool = True,
) -> Callable:
    """Decorator that adds retry behaviour to an async function.

    Usage::

        @with_retry(max_retries=5)
        async def call_api():
            ...
    """
    cfg = RetryConfig(
        max_retries=max_retries,
        base_delay=base_delay,
        max_delay=max_delay,
        exponential=exponential,
    )

    def decorator(func: Callable[..., Coroutine]) -> Callable[..., Coroutine]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            return await retry(func, *args, config=cfg, **kwargs)
        return wrapper

    return decorator

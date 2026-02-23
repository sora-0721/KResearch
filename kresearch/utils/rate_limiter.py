"""Rate-limiting utilities for KResearch."""

from __future__ import annotations

import asyncio
import time
from collections import deque


class RateLimiter:
    """Sliding-window rate limiter based on requests per minute.

    Usage::

        limiter = RateLimiter(requests_per_minute=60)
        await limiter.acquire()  # blocks if rate exceeded
        await do_request()

    Parameters
    ----------
    requests_per_minute:
        Maximum number of requests allowed within a 60-second window.
    """

    def __init__(self, requests_per_minute: int) -> None:
        self.requests_per_minute = requests_per_minute
        self._timestamps: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Wait until a request slot is available, then record the timestamp."""
        async with self._lock:
            now = time.monotonic()
            window = 60.0

            # Discard timestamps older than the window
            while self._timestamps and (now - self._timestamps[0]) >= window:
                self._timestamps.popleft()

            if len(self._timestamps) >= self.requests_per_minute:
                # Wait until the oldest timestamp exits the window
                sleep_for = window - (now - self._timestamps[0])
                if sleep_for > 0:
                    await asyncio.sleep(sleep_for)

                # Clean again after sleeping
                now = time.monotonic()
                while self._timestamps and (now - self._timestamps[0]) >= window:
                    self._timestamps.popleft()

            self._timestamps.append(time.monotonic())


class TokenBucket:
    """Async token-bucket rate limiter.

    Tokens are refilled continuously at *rate* tokens per second up to
    *capacity*.

    Usage::

        bucket = TokenBucket(rate=10, capacity=100)
        if await bucket.consume(5):
            await do_work()

    Parameters
    ----------
    rate:
        Tokens added per second.
    capacity:
        Maximum number of tokens the bucket can hold.
    """

    def __init__(self, rate: float, capacity: float) -> None:
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        """Add tokens based on elapsed time since last refill."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_refill = now

    async def consume(self, n: int = 1) -> bool:
        """Consume *n* tokens, waiting if necessary.

        Returns ``True`` once the tokens have been consumed.  If *n*
        exceeds *capacity* the call will still eventually succeed after
        enough tokens have accumulated.
        """
        async with self._lock:
            self._refill()

            while self.tokens < n:
                # Calculate wait time for enough tokens
                deficit = n - self.tokens
                wait = deficit / self.rate
                await asyncio.sleep(wait)
                self._refill()

            self.tokens -= n
            return True

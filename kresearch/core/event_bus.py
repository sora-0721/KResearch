"""EventBus: async pub/sub for internal events."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable


@dataclass
class Event:
    """An event emitted on the bus."""

    type: str
    data: dict = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


# Subscriber signature: async callable that receives an Event
Subscriber = Callable[[Event], Awaitable[None]]


class EventBus:
    """Simple async publish/subscribe event bus."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Subscriber]] = {}

    # --- Subscription management ---

    def subscribe(self, event_type: str, callback: Subscriber) -> None:
        """Register a callback for an event type."""
        self._subscribers.setdefault(event_type, [])
        if callback not in self._subscribers[event_type]:
            self._subscribers[event_type].append(callback)

    def unsubscribe(self, event_type: str, callback: Subscriber) -> None:
        """Remove a callback for an event type."""
        subs = self._subscribers.get(event_type, [])
        if callback in subs:
            subs.remove(callback)

    # --- Publishing ---

    async def publish(self, event_type: str, data: dict | None = None) -> None:
        """Publish an event and await all subscriber callbacks."""
        event = Event(type=event_type, data=data or {})
        subscribers = list(self._subscribers.get(event_type, []))
        # Also notify wildcard subscribers
        subscribers.extend(self._subscribers.get("*", []))
        if not subscribers:
            return
        await asyncio.gather(
            *(sub(event) for sub in subscribers),
            return_exceptions=True,
        )

    def publish_sync(self, event_type: str, data: dict | None = None) -> None:
        """Schedule an async publish on the running event loop.

        If no loop is running, creates a task via ensure_future fallback.
        """
        coro = self.publish(event_type, data)
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(coro)
        except RuntimeError:
            # No running loop -- create one just for this call
            asyncio.run(coro)

    # --- Introspection ---

    def subscriber_count(self, event_type: str) -> int:
        """Return the number of subscribers for an event type."""
        return len(self._subscribers.get(event_type, []))

    def clear(self) -> None:
        """Remove all subscribers."""
        self._subscribers.clear()

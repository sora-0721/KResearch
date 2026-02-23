"""TelegramBot: thin wrapper around python-telegram-bot for sending messages."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class TelegramBot:
    """Manages the Telegram bot connection and message sending.

    Operates in *no-op mode* when ``token`` is empty or ``None``,
    so the rest of the application can run without Telegram configured.
    """

    def __init__(self, token: Optional[str] = None, chat_id: Optional[str] = None) -> None:
        self._token = token or ""
        self._default_chat_id = chat_id
        self._application = None  # telegram.ext.Application
        self._enabled = bool(self._token)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def application(self):
        """Return the underlying ``telegram.ext.Application`` (or *None*)."""
        return self._application

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Build and start the Telegram application.

        If ``token`` was not provided, the method returns immediately
        (no-op mode).
        """
        if not self._enabled:
            logger.info("Telegram bot token not set — running in no-op mode.")
            return

        try:
            from telegram.ext import ApplicationBuilder

            self._application = (
                ApplicationBuilder().token(self._token).build()
            )
            await self._application.initialize()
            await self._application.start()
            if self._application.updater:
                await self._application.updater.start_polling()
            logger.info("Telegram bot started successfully.")
        except Exception:
            logger.exception("Failed to start Telegram bot — falling back to no-op mode.")
            self._enabled = False
            self._application = None

    async def stop(self) -> None:
        """Gracefully shut down the bot."""
        if self._application is None:
            return

        try:
            if self._application.updater and self._application.updater.running:
                await self._application.updater.stop()
            await self._application.stop()
            await self._application.shutdown()
            logger.info("Telegram bot stopped.")
        except Exception:
            logger.exception("Error while stopping Telegram bot.")
        finally:
            self._application = None

    # ------------------------------------------------------------------
    # Messaging helpers
    # ------------------------------------------------------------------

    def _resolve_chat_id(self, chat_id: Optional[str] = None) -> Optional[str]:
        return chat_id or self._default_chat_id

    async def send_message(self, text: str, chat_id: Optional[str] = None) -> None:
        """Send a text message.  No-op when the bot is disabled."""
        cid = self._resolve_chat_id(chat_id)
        if not self._enabled or self._application is None or cid is None:
            return
        try:
            await self._application.bot.send_message(
                chat_id=cid,
                text=text,
                parse_mode="MarkdownV2",
            )
        except Exception:
            logger.exception("Failed to send Telegram message.")

    async def send_document(
        self, file_path: Path, chat_id: Optional[str] = None
    ) -> None:
        """Send a file as a Telegram document.  No-op when disabled."""
        cid = self._resolve_chat_id(chat_id)
        if not self._enabled or self._application is None or cid is None:
            return
        try:
            with open(file_path, "rb") as fh:
                await self._application.bot.send_document(
                    chat_id=cid,
                    document=fh,
                    filename=file_path.name,
                )
        except Exception:
            logger.exception("Failed to send Telegram document.")

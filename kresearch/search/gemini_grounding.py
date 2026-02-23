"""Gemini grounding search provider (uses Gemini API credits)."""

from __future__ import annotations

import os

from .base import SearchProvider
from .registry import register


class GeminiGroundingSearchProvider(SearchProvider):
    """Web search that piggybacks on Google Gemini's grounding capability."""

    def __init__(self, api_key: str | None = None, **kwargs):
        super().__init__(
            api_key=api_key or os.getenv("GOOGLE_API_KEY"),
            **kwargs,
        )
        self._model: str = kwargs.get("model", "gemini-2.0-flash")

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "gemini_grounding"

    @property
    def is_free(self) -> bool:
        return False

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        if not self._api_key:
            return False
        try:
            from google import genai  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        """Use Gemini with grounding to perform a web search."""
        import asyncio
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self._api_key)
        grounding_tool = types.Tool(
            google_search=types.GoogleSearch(),
        )

        response = await asyncio.to_thread(
            client.models.generate_content,
            model=self._model,
            contents=query,
            config=types.GenerateContentConfig(
                tools=[grounding_tool],
                temperature=0.0,
            ),
        )

        results: list[dict] = []
        # Extract grounding metadata from the response.
        metadata = getattr(response.candidates[0], "grounding_metadata", None)
        if metadata and hasattr(metadata, "grounding_chunks"):
            for chunk in metadata.grounding_chunks[:max_results]:
                web = getattr(chunk, "web", None)
                if web:
                    results.append(
                        {
                            "title": getattr(web, "title", ""),
                            "url": getattr(web, "uri", ""),
                            "snippet": "",
                            "source": self.name,
                        }
                    )

        # If grounding metadata is sparse, add the generated text as context.
        if not results:
            text = response.text or ""
            results.append(
                {
                    "title": f"Gemini grounded answer for: {query}",
                    "url": "",
                    "snippet": text[:1000],
                    "source": self.name,
                }
            )

        return results[:max_results]


register("gemini_grounding", GeminiGroundingSearchProvider)

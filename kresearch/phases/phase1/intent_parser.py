"""IntentParser phase: parse user query into structured research intent."""

from __future__ import annotations

import json
import logging
from typing import Any

from kresearch.phases.base import Phase
from .perspective_discovery import discover_perspectives
from .task_graph_builder import build_task_graph
from .mind_map_initializer import initialize_mind_map

logger = logging.getLogger(__name__)

_INTENT_SYSTEM_PROMPT = """\
You are a research-intent analyser. Given a user's research query, produce \
a structured JSON object with EXACTLY these keys:

- "topic": concise statement of the research topic
- "sub_questions": list of 3-8 specific sub-questions to investigate
- "complexity": one of "simple", "moderate", "complex", "expert"
- "research_type": one of "factual", "comparative", "exploratory", \
  "argumentative", "methodological"

Return ONLY valid JSON. No markdown fences, no commentary."""


class IntentParser(Phase):
    """Phase 1 -- Metacognitive Intent Parsing.

    Parses the raw user query into structured intent, discovers expert
    perspectives, builds the task graph, and seeds the epistemic mind map.
    """

    @property
    def phase_number(self) -> int:
        return 1

    @property
    def phase_name(self) -> str:
        return "Metacognitive Intent Parsing"

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def execute(self) -> None:
        """Run the full Phase-1 pipeline."""
        query = self.session.original_query

        # Step 1 -- structured intent parsing
        intent = await self._parse_intent(query)
        logger.info("Parsed intent: %s", intent.get("topic"))

        # Step 2 -- perspective discovery
        llm = await self._get_llm()
        perspectives = await discover_perspectives(
            query=query,
            intent=intent,
            llm_provider=llm,
            config=self.config,
        )
        self.session.perspectives = perspectives
        logger.info("Discovered %d perspectives", len(perspectives))

        # Step 3 -- task-graph construction
        task_graph = await build_task_graph(
            query=query,
            intent=intent,
            perspectives=perspectives,
        )
        self.session.task_graph = task_graph

        # Step 4 -- mind-map seeding
        mind_map = await initialize_mind_map(
            query=query,
            intent=intent,
            perspectives=perspectives,
        )
        self.session.mind_map = mind_map

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _parse_intent(self, query: str) -> dict[str, Any]:
        """Send the query to the LLM and return structured intent JSON."""
        llm = await self._get_llm()
        model = self.config.llm.model

        response = await llm.complete(
            messages=[{"role": "user", "content": query}],
            model=model,
            temperature=0.3,
            max_tokens=1024,
            json_mode=True,
            system_prompt=_INTENT_SYSTEM_PROMPT,
        )

        raw = response["content"]
        intent = json.loads(raw) if isinstance(raw, str) else raw

        # Guarantee required keys with sensible defaults
        intent.setdefault("topic", query)
        intent.setdefault("sub_questions", [])
        intent.setdefault("complexity", "moderate")
        intent.setdefault("research_type", "exploratory")

        self.session.parsed_intent = intent
        return intent

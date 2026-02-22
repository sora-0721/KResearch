"""DiffusionWriter: iterative draft-centric diffusion synthesis."""

from __future__ import annotations

import json
import logging
from typing import Any

from kresearch.phases.base import Phase
from .skeleton_builder import build_skeleton
from .evaluation_loop import evaluate_draft
from .finalizer import finalize_report

logger = logging.getLogger(__name__)

_ROUGH_DRAFT_PROMPT = (
    "You are a research report writer. Given a report skeleton with section "
    "headings and key points, write a rough first draft in markdown. For each "
    "section, write 1-2 paragraphs covering the key points. Use placeholder "
    "citations like [source] where evidence is referenced. Keep the tone "
    "academic but accessible."
)

_DENOISE_PROMPT = (
    "You are an expert research editor performing iterative refinement. "
    "Given the current draft, evidence nodes from the knowledge base, and "
    "evaluation feedback, improve the draft by: expanding claims with "
    "specific evidence and data from the provided nodes; improving logical "
    "flow and transitions between sections; replacing placeholder citations "
    "with actual source references [source_text]; fixing any issues raised "
    "in the feedback. Return the COMPLETE improved draft in markdown."
)


class DiffusionWriter(Phase):
    """Phase 5 -- Draft-Centric Diffusion Synthesis.

    Generates a rough draft from the mind-map skeleton, then iteratively
    refines it through a diffusion-style denoising loop with LLM-based
    evaluation at each step.
    """

    @property
    def phase_number(self) -> int:
        return 5

    @property
    def phase_name(self) -> str:
        return "Draft-Centric Diffusion Synthesis"

    async def execute(self) -> None:
        """Run the full Phase-5 pipeline."""
        await self.event_bus.publish("phase.start", {"phase": self.phase_number})

        llm = await self._get_llm()
        mind_map = self.session.mind_map
        query = self.session.original_query
        intent = self.session.parsed_intent

        # Step 1 -- build report skeleton
        skeleton = await build_skeleton(mind_map, query, intent, llm)
        logger.info("Skeleton built: %s", skeleton.get("title"))

        # Step 2 -- generate rough draft (iteration 0)
        draft = await self._generate_rough_draft(skeleton, llm)
        self.session.draft_iterations.append({"iteration": 0, "draft": draft})

        # Step 3 -- iterative denoising loop
        min_score = self.config.eval.min_score
        max_iters = self.config.eval.max_iterations

        for i in range(1, max_iters + 1):
            eval_result = await evaluate_draft(draft, query, llm)
            avg = eval_result["avg_score"]
            feedback = eval_result["feedback"]
            logger.info("Iteration %d: avg_score=%.1f", i, avg)
            self.session.draft_iterations[-1]["eval"] = eval_result

            if self._all_scores_pass(eval_result["scores"], min_score):
                logger.info("All scores >= %.1f at iteration %d", min_score, i)
                break

            draft = await self._denoise_draft(draft, mind_map, feedback, llm)
            self.session.draft_iterations.append({"iteration": i, "draft": draft})
            await self.event_bus.publish("phase.progress", {
                "phase": self.phase_number, "iteration": i, "avg_score": avg,
            })

        # Step 4 -- finalize report
        final = await finalize_report(draft, mind_map, self.session, llm)
        self.session.final_report = final

        await self.event_bus.publish("report.export", {
            "session_id": self.session.id, "report_length": len(final),
        })
        self.session.advance_phase()
        await self.event_bus.publish("phase.complete", {
            "phase": self.phase_number,
            "iterations": len(self.session.draft_iterations),
        })

    @staticmethod
    def _all_scores_pass(scores: dict[str, int], threshold: float) -> bool:
        """Check whether every dimension meets the minimum threshold."""
        return all(v >= threshold for v in scores.values())

    async def _generate_rough_draft(self, skeleton: dict[str, Any], llm: Any) -> str:
        """Create the initial rough draft from the skeleton."""
        skeleton_text = json.dumps(skeleton, indent=2, default=str)
        response = await llm.complete(
            messages=[{"role": "user", "content": f"Report skeleton:\n{skeleton_text}"}],
            model=getattr(llm, "_default_model", "gpt-4o"),
            temperature=0.5, max_tokens=4096,
            system_prompt=_ROUGH_DRAFT_PROMPT,
        )
        return response["content"]

    async def _denoise_draft(
        self, draft: str, mind_map: Any, feedback: str, llm: Any,
    ) -> str:
        """Refine the draft using mind-map evidence and prior feedback."""
        evidence = self._extract_evidence(mind_map)
        user_msg = (
            f"Current draft:\n{draft}\n\n"
            f"Evidence nodes:\n{json.dumps(evidence, indent=2, default=str)}\n\n"
            f"Evaluator feedback:\n{feedback}"
        )
        response = await llm.complete(
            messages=[{"role": "user", "content": user_msg}],
            model=getattr(llm, "_default_model", "gpt-4o"),
            temperature=0.4, max_tokens=4096,
            system_prompt=_DENOISE_PROMPT,
        )
        return response["content"]

    @staticmethod
    def _extract_evidence(mind_map: Any) -> list[dict]:
        """Pull evidence-relevant data from mind-map nodes."""
        data = mind_map.to_dict()
        return [
            {
                "id": nid,
                "content": nd.get("content", ""),
                "confidence": nd.get("confidence", "UNVERIFIED"),
                "sources": nd.get("sources", []),
            }
            for nid, nd in data.get("nodes", {}).items()
        ]

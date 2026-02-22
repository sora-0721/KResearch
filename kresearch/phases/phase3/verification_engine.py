"""VerificationEngine: Phase 3 orchestrator for Turing-complete verification."""

from __future__ import annotations

import logging
from typing import Any

from kresearch.core.mind_map_node import ConfidenceLevel
from kresearch.phases.base import Phase
from .claim_extractor import extract_claims
from .code_verifier import verify_with_code
from .data_verifier import verify_with_data
from .statistical_analyzer import verify_statistical

logger = logging.getLogger(__name__)

_CODE_TYPES = {"numerical", "computational"}


class VerificationEngine(Phase):
    """Phase 3 -- Turing-Complete Verification.

    Extracts verifiable claims from the mind map, routes each claim
    to the appropriate verifier (code, statistical, or data), and
    updates node confidence based on results.
    """

    @property
    def phase_number(self) -> int:
        return 3

    @property
    def phase_name(self) -> str:
        return "Turing-Complete Verification"

    async def execute(self) -> None:
        """Run the full Phase-3 verification pipeline."""
        await self.event_bus.publish(
            "phase.start", {"phase": self.phase_number},
        )
        llm = await self._get_llm()
        search = await self._get_search()
        sandbox = await self._get_sandbox()
        mind_map = self.session.mind_map

        # Step 1: Extract verifiable claims
        claims = await extract_claims(mind_map, llm)
        logger.info("Found %d verifiable claims.", len(claims))
        if not claims:
            await self._finish(verified=0, failed=0)
            return

        # Step 2: Route and verify each claim
        verified_count = 0
        failed_count = 0
        for claim in claims:
            claim_type = claim.get("claim_type", "")
            try:
                result = await self._route_claim(
                    claim, claim_type, llm, search, sandbox,
                )
            except Exception:
                logger.exception(
                    "Error verifying claim %s", claim.get("node_id"),
                )
                result = {
                    "verified": False, "confidence": 0.1,
                    "evidence": "Verification error",
                }

            # Step 3: Update mind map confidence
            self._apply_result(mind_map, claim, result)

            # Step 4: Store result
            self.session.verification_results.append({
                "node_id": claim["node_id"],
                "claim": claim.get("claim", ""),
                "claim_type": claim_type,
                "result": result,
            })
            if result.get("verified"):
                verified_count += 1
            else:
                failed_count += 1

        await self._finish(verified=verified_count, failed=failed_count)

    async def _route_claim(
        self, claim: dict, claim_type: str,
        llm: Any, search: Any, sandbox: Any,
    ) -> dict:
        """Route a claim to the appropriate verifier by type."""
        if claim_type in _CODE_TYPES:
            return await verify_with_code(claim, llm, sandbox)
        if claim_type == "statistical":
            return await verify_statistical(claim, llm, sandbox)
        if claim_type == "factual":
            return await verify_with_data(claim, search, llm)
        logger.warning("Unknown claim type '%s', using data verifier.", claim_type)
        return await verify_with_data(claim, search, llm)

    @staticmethod
    def _apply_result(mind_map: Any, claim: dict, result: dict) -> None:
        """Update a mind-map node's confidence based on verification."""
        node = mind_map.get_node(claim["node_id"])
        if node is None:
            return
        confidence = result.get("confidence", 0.0)
        if result.get("verified") and confidence >= 0.7:
            node.update_confidence(ConfidenceLevel.VERIFIED)
        elif result.get("verified"):
            node.update_confidence(ConfidenceLevel.HIGH)
        elif confidence >= 0.4:
            node.update_confidence(ConfidenceLevel.CONTESTED)
        else:
            node.update_confidence(ConfidenceLevel.LOW)

    async def _get_sandbox(self) -> Any:
        """Get the configured sandbox instance."""
        from kresearch.sandbox.base import Sandbox
        return Sandbox(self.config)

    async def _finish(self, verified: int, failed: int) -> None:
        """Publish completion event and advance session phase."""
        self.session.advance_phase()
        await self.event_bus.publish("phase.complete", {
            "phase": self.phase_number,
            "verified": verified,
            "failed": failed,
            "total_results": len(self.session.verification_results),
        })
        logger.info(
            "Phase 3 complete: %d verified, %d failed.", verified, failed,
        )

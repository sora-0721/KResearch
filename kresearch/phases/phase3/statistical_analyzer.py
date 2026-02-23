"""Verify statistical claims by generating and executing analysis code."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_STATS_CODE_PROMPT = """\
You are a statistical verification engineer. Given a statistical claim, \
write a self-contained Python script that verifies it.

Rules:
1. Use ONLY the Python standard library (math, statistics, random, etc.)
2. Do NOT use numpy, pandas, scipy, or any external packages.
3. The script must print ONLY a JSON object with keys:
   - "verified": true or false
   - "analysis": brief explanation of the statistical test or reasoning
   - "computed_value": the key computed statistic (as a number or string)
4. Do NOT use input() or external APIs.

Claim to verify: {claim}
Approach: {approach}

Return ONLY Python code. No markdown fences, no commentary."""

_STATS_FIX_PROMPT = """\
The statistical verification code produced an error. Rewrite it.

Claim: {claim}
Previous code:
```
{code}
```
Error:
```
{error}
```

Rules: Use only Python standard library. Print only a JSON object.
Return ONLY corrected Python code. No markdown fences."""

MAX_RETRIES = 3


async def verify_statistical(
    claim: dict,
    llm_provider: Any,
    sandbox: Any,
) -> dict:
    """Verify a statistical claim by generating and running analysis code.

    Uses standard-library-only Python to verify percentages, trends,
    comparisons, and other statistical assertions.

    Returns a dict with keys:
        verified, confidence, analysis
    """
    claim_text = claim.get("claim", "")
    approach = claim.get("verification_approach", "")

    # Generate initial code
    prompt = _STATS_CODE_PROMPT.format(claim=claim_text, approach=approach)
    response = await llm_provider.complete(
        messages=[{"role": "user", "content": prompt}],
        model=llm_provider.available_models[0],
        temperature=0.1,
        max_tokens=2048,
    )
    code = _clean_code(response["content"])

    error_msg = ""
    for attempt in range(MAX_RETRIES):
        result = await sandbox.execute_python(code, timeout=30)

        if result.timed_out:
            return _failure("Statistical code execution timed out.")

        if result.return_code == 0 and result.stdout.strip():
            parsed = _try_parse(result.stdout)
            if parsed is not None:
                verified = parsed.get("verified", False)
                return {
                    "verified": verified,
                    "confidence": 0.8 if verified else 0.35,
                    "analysis": parsed.get("analysis", ""),
                }

        error_msg = result.stderr or result.stdout or "No output"
        logger.warning(
            "Statistical verification attempt %d/%d failed: %s",
            attempt + 1, MAX_RETRIES, error_msg[:200],
        )

        if attempt < MAX_RETRIES - 1:
            fix_prompt = _STATS_FIX_PROMPT.format(
                claim=claim_text, code=code, error=error_msg,
            )
            fix_resp = await llm_provider.complete(
                messages=[{"role": "user", "content": fix_prompt}],
                model=llm_provider.available_models[0],
                temperature=0.2,
                max_tokens=2048,
            )
            code = _clean_code(fix_resp["content"])

    return _failure(f"All {MAX_RETRIES} attempts failed. Last error: {error_msg}")


def _clean_code(raw: str) -> str:
    """Strip markdown fences and whitespace."""
    text = raw.strip()
    if text.startswith("```python"):
        text = text[len("```python"):]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _try_parse(stdout: str) -> dict | None:
    """Attempt to parse JSON from stdout."""
    try:
        return json.loads(stdout.strip())
    except (json.JSONDecodeError, ValueError):
        return None


def _failure(reason: str) -> dict:
    """Return a standardized failure result."""
    return {
        "verified": False,
        "confidence": 0.1,
        "analysis": reason,
    }

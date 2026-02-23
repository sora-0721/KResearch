"""Verify numerical and computational claims by generating and executing code."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_CODE_GEN_PROMPT = """\
You are a verification engineer. Given a claim, write a self-contained \
Python script that checks whether the claim is true or false.

The script must:
1. Print ONLY a JSON object with keys:
   - "verified": true or false
   - "evidence": a brief explanation of the result
2. Use only the Python standard library (math, statistics, datetime, etc.)
3. Do NOT use input() or any external APIs.
4. Be concise and correct.

Claim to verify: {claim}
Approach: {approach}

Return ONLY the Python code. No markdown fences, no commentary."""

_FIX_PROMPT = """\
The verification code produced an error. Rewrite it to fix the issue.

Original claim: {claim}
Previous code:
```
{code}
```
Error output:
```
{error}
```

Return ONLY corrected Python code. No markdown fences, no commentary."""

MAX_RETRIES = 3


async def verify_with_code(
    claim: dict,
    llm_provider: Any,
    sandbox: Any,
) -> dict:
    """Generate and execute Python code to verify a claim.

    Uses an RL-style retry loop: if code errors, the error is sent
    back to the LLM for a rewrite, up to MAX_RETRIES attempts.

    Returns a dict with keys:
        verified, confidence, evidence, code, output
    """
    claim_text = claim.get("claim", "")
    approach = claim.get("verification_approach", "")

    # Step 1: Generate initial verification code
    prompt = _CODE_GEN_PROMPT.format(claim=claim_text, approach=approach)
    response = await llm_provider.complete(
        messages=[{"role": "user", "content": prompt}],
        model=llm_provider.available_models[0],
        temperature=0.1,
        max_tokens=2048,
    )
    code = _clean_code(response["content"])

    # Step 2: Execute with retry loop
    for attempt in range(MAX_RETRIES):
        result = await sandbox.execute_python(code, timeout=30)

        if result.timed_out:
            return _failure("Code execution timed out.", code, "")

        if result.return_code == 0 and result.stdout.strip():
            parsed = _parse_output(result.stdout)
            if parsed is not None:
                return {
                    "verified": parsed.get("verified", False),
                    "confidence": 0.85 if parsed.get("verified") else 0.3,
                    "evidence": parsed.get("evidence", ""),
                    "code": code,
                    "output": result.stdout.strip(),
                }

        # Code errored or output was unparseable -- retry
        error_msg = result.stderr or result.stdout or "No output produced"
        logger.warning(
            "Code verification attempt %d/%d failed: %s",
            attempt + 1, MAX_RETRIES, error_msg[:200],
        )

        if attempt < MAX_RETRIES - 1:
            fix_prompt = _FIX_PROMPT.format(
                claim=claim_text, code=code, error=error_msg,
            )
            fix_response = await llm_provider.complete(
                messages=[{"role": "user", "content": fix_prompt}],
                model=llm_provider.available_models[0],
                temperature=0.2,
                max_tokens=2048,
            )
            code = _clean_code(fix_response["content"])

    return _failure("All retry attempts exhausted.", code, error_msg)


def _clean_code(raw: str) -> str:
    """Strip markdown fences and leading/trailing whitespace."""
    text = raw.strip()
    if text.startswith("```python"):
        text = text[len("```python"):]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _parse_output(stdout: str) -> dict | None:
    """Try to parse JSON from the script's stdout."""
    try:
        return json.loads(stdout.strip())
    except (json.JSONDecodeError, ValueError):
        return None


def _failure(reason: str, code: str, output: str) -> dict:
    """Return a standardized failure result."""
    return {
        "verified": False,
        "confidence": 0.1,
        "evidence": reason,
        "code": code,
        "output": output,
    }

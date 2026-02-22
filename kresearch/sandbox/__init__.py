"""Sandbox module for safe code execution in KResearch."""

from kresearch.sandbox.base import ExecutionResult, Sandbox
from kresearch.sandbox.factory import create_sandbox

__all__ = ["ExecutionResult", "Sandbox", "create_sandbox"]

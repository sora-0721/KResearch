"""KResearch utilities package."""

from kresearch.utils.text import (
    truncate,
    count_tokens_approx,
    clean_json_response,
    extract_json,
    slugify,
    deduplicate_texts,
)
from kresearch.utils.async_helpers import (
    gather_with_limit,
    run_sync,
    timeout_wrap,
    create_semaphore_map,
)
from kresearch.utils.retry import RetryConfig, retry, with_retry
from kresearch.utils.rate_limiter import RateLimiter, TokenBucket
from kresearch.utils.logger import setup_logger, get_logger
from kresearch.utils.validators import (
    validate_query,
    validate_api_key,
    validate_url,
    validate_file_path,
    validate_model_name,
)

__all__ = [
    # text
    "truncate",
    "count_tokens_approx",
    "clean_json_response",
    "extract_json",
    "slugify",
    "deduplicate_texts",
    # async
    "gather_with_limit",
    "run_sync",
    "timeout_wrap",
    "create_semaphore_map",
    # retry
    "RetryConfig",
    "retry",
    "with_retry",
    # rate limiter
    "RateLimiter",
    "TokenBucket",
    # logger
    "setup_logger",
    "get_logger",
    # validators
    "validate_query",
    "validate_api_key",
    "validate_url",
    "validate_file_path",
    "validate_model_name",
]

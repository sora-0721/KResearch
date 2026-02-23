"""KResearch constants and enumerations."""

from enum import StrEnum

from kresearch import __version__

# ---------------------------------------------------------------------------
# Application metadata
# ---------------------------------------------------------------------------
APP_NAME: str = "KResearch"
VERSION: str = __version__

# ---------------------------------------------------------------------------
# Concurrency / networking defaults
# ---------------------------------------------------------------------------
DEFAULT_CONCURRENCY: int = 15
MAX_RETRIES: int = 3
DEFAULT_TIMEOUT: int = 30  # seconds

# ---------------------------------------------------------------------------
# Evaluation thresholds
# ---------------------------------------------------------------------------
MIN_EVAL_SCORE: float = 7.0
MAX_EVAL_SCORE: float = 10.0

# ---------------------------------------------------------------------------
# Research depth limits
# ---------------------------------------------------------------------------
MAX_SEARCH_RESULTS: int = 20
MAX_FOLLOW_UP_DEPTH: int = 3
MAX_SOURCES_PER_PHASE: int = 50
CHUNK_SIZE: int = 1500
CHUNK_OVERLAP: int = 200

# ---------------------------------------------------------------------------
# Output defaults
# ---------------------------------------------------------------------------
DEFAULT_REPORT_FORMAT: str = "markdown"
DEFAULT_OUTPUT_DIR: str = "output"


# ---------------------------------------------------------------------------
# Confidence levels assigned during evaluation
# ---------------------------------------------------------------------------
class ConfidenceLevel(StrEnum):
    """Confidence levels for research findings."""

    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


# ---------------------------------------------------------------------------
# Task types that agents can execute
# ---------------------------------------------------------------------------
class TaskType(StrEnum):
    """Types of tasks the research agent can perform."""

    SEARCH = "search"
    ANALYZE = "analyze"
    SYNTHESIZE = "synthesize"
    EVALUATE = "evaluate"
    GENERATE = "generate"
    VERIFY = "verify"
    SUMMARIZE = "summarize"


# ---------------------------------------------------------------------------
# Research phases (pipeline stages)
# ---------------------------------------------------------------------------
class Phase(StrEnum):
    """Named phases of the research pipeline."""

    PLANNING = "planning"
    SEARCHING = "searching"
    ANALYZING = "analyzing"
    SYNTHESIZING = "synthesizing"
    EVALUATING = "evaluating"
    REPORTING = "reporting"


PHASE_NAMES: dict[Phase, str] = {
    Phase.PLANNING: "Query Planning & Decomposition",
    Phase.SEARCHING: "Multi-Source Search",
    Phase.ANALYZING: "Deep Analysis",
    Phase.SYNTHESIZING: "Cross-Source Synthesis",
    Phase.EVALUATING: "Quality Evaluation",
    Phase.REPORTING: "Report Generation",
}

# ---------------------------------------------------------------------------
# LLM provider identifiers
# ---------------------------------------------------------------------------
class LLMProvider(StrEnum):
    """Supported LLM provider identifiers."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    XAI = "xai"
    PERPLEXITY = "perplexity"
    DEEPSEEK = "deepseek"
    OLLAMA = "ollama"


# ---------------------------------------------------------------------------
# Search provider identifiers
# ---------------------------------------------------------------------------
class SearchProvider(StrEnum):
    """Supported search provider identifiers."""

    TAVILY = "tavily"
    SERPAPI = "serpapi"
    DUCKDUCKGO = "duckduckgo"
    JINA = "jina"
    GOOGLE_CSE = "google_cse"

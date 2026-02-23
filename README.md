# KResearch

**AI-Powered Deep Research Agent with the Omega Workflow**

KResearch is a terminal-based deep research agent that implements a full 5-phase "Omega Workflow" to produce comprehensive, citation-backed research reports. It supports 7 LLM providers, 7 search engines, local RAG with ChromaDB, code sandbox verification, Telegram bot integration, and a beautiful Rich terminal UI.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [The Omega Workflow](#the-omega-workflow)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Slash Commands](#slash-commands)
- [LLM Providers](#llm-providers)
- [Search Providers](#search-providers)
- [RAG (Local Knowledge Base)](#rag-local-knowledge-base)
- [Code Sandbox](#code-sandbox)
- [Telegram Integration](#telegram-integration)
- [Project Structure](#project-structure)
- [Configuration Reference](#configuration-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **5-Phase Omega Workflow** -- Intent parsing, swarm retrieval, verification, conflict resolution, and diffusion synthesis
- **7 LLM Providers** -- OpenAI, Anthropic, Google Gemini, Grok (xAI), Perplexity, DeepSeek, Ollama (local)
- **7 Search Providers** -- Tavily, DuckDuckGo (free), Jina (free), SerpAPI, Google CSE, BeautifulSoup scraper (free), Gemini Grounding
- **Epistemic Mind Map** -- Directed graph of claims, concepts, and evidence with confidence tracking
- **Task Graph DAG** -- Parallelizable research tasks with dependency chains
- **Code Sandbox Verification** -- Execute Python to verify numerical and statistical claims (Docker or subprocess)
- **Local RAG** -- Ingest documents into ChromaDB for retrieval-augmented research
- **Telegram Bot** -- Monitor research progress and receive reports via Telegram
- **Rich Terminal UI** -- Colored panels, progress bars, tree visualizations, and styled tables
- **Export** -- Markdown and JSON report export with bibliography and metadata
- **Async-First** -- Built on `asyncio` with per-provider semaphores and concurrent task execution
- **Modular Architecture** -- Hexagonal (ports & adapters) design; every file stays under 150 lines

---

## Architecture

KResearch follows a **hexagonal (ports & adapters)** architecture:

```
                        +-------------------+
                        |   Terminal REPL   |
                        |   (Rich UI)       |
                        +--------+----------+
                                 |
                        +--------v----------+
                        |   App / Commands  |
                        +--------+----------+
                                 |
              +------------------+------------------+
              |                  |                  |
     +--------v------+  +-------v-------+  +-------v-------+
     | LLM Providers |  | Search Provs  |  |   EventBus    |
     | (7 adapters)  |  | (7 adapters)  |  | (pub/sub)     |
     +--------+------+  +-------+-------+  +-------+-------+
              |                  |                  |
              +------------------+------------------+
                                 |
                        +--------v----------+
                        |   Phase Runner    |
                        | (5-phase pipeline)|
                        +--------+----------+
                                 |
         +-----------+-----------+-----------+-----------+
         |           |           |           |           |
    +----v---+  +----v---+  +----v---+  +----v---+  +----v---+
    |Phase 1 |  |Phase 2 |  |Phase 3 |  |Phase 4 |  |Phase 5 |
    |Intent  |  |Swarm   |  |Verify  |  |Conflict|  |Synth   |
    +--------+  +--------+  +----+---+  +--------+  +--------+
                                 |
                            +----v----+
                            | Sandbox |
                            +---------+
```

**Shared State**: A `ResearchSession` object flows through all 5 phases, carrying the mind map, task graph, and accumulated evidence.

**Event Bus**: Async pub/sub decouples UI rendering and Telegram notifications from core logic.

---

## The Omega Workflow

### Phase 1: Metacognitive Intent Parsing

1. LLM analyzes the query to extract structured intent (topic, sub-questions, complexity, research type)
2. STORM-style perspective discovery generates 3--6 expert viewpoints with persona-specific questions
3. Builds a TaskGraph DAG with SEARCH, DISCOURSE, and VERIFY tasks linked by dependencies
4. Initializes the Epistemic Mind Map skeleton (root node, perspectives, sub-questions -- all UNVERIFIED)

### Phase 2: Decentralized Swarm Retrieval

1. SwarmCoordinator processes the TaskGraph in topological layers
2. `asyncio.gather(return_exceptions=True)` provides partial-failure tolerance
3. Per-provider semaphores enforce rate limits (e.g., Tavily=5, DuckDuckGo=10) with a global cap (15)
4. Complex nodes trigger multi-turn discourse (expert vs. interrogator, 3--5 turns)
5. Context compactor summarizes and deduplicates results into the Mind Map

### Phase 3: Turing-Complete Verification

1. Extracts verifiable claims from the Mind Map (numerical, computational, statistical, factual)
2. Routes claims to specialized verifiers:
   - **Numerical/Computational** -- LLM generates Python code, executed in sandbox
   - **Statistical** -- Standard-library stats verification in sandbox
   - **Factual** -- Cross-reference via web search
3. RL-style retry: if verification code errors, the error is fed back to the LLM for code rewriting (up to 3 attempts)
4. Updates Mind Map confidence levels based on verification outcomes

### Phase 4: Epistemic Conflict Resolution

1. Detects contradictions across Mind Map nodes (conflicting claims from different sources)
2. Runs a 7-level consistency check: logical, temporal, numerical, source, perspective, evidential, inferential
3. Source hierarchy ranking: peer-reviewed (5) > government (4) > news (3) > blogs (2) > social/forums (1)
4. Markov-style resolution using transition probabilities from credibility, recency, and corroboration
5. Winning claims gain higher confidence; rejected claims are marked CONTESTED with explanations

### Phase 5: Draft-Centric Diffusion Synthesis

1. Builds a structural skeleton by grouping Mind Map nodes into thematic clusters
2. Iterative "denoising" loop: rough draft, expand with evidence, improve flow, add citations
3. External evaluation model scores each iteration on 5 dimensions (accuracy, completeness, coherence, citations, balance)
4. Loops until all scores meet the configurable threshold (default: 7.0/10) or max iterations reached
5. Finalizer compiles the report with bibliography, metadata header, and numbered citations

---

## Quickstart

### Prerequisites

- Python 3.11 or later
- At least one LLM API key (or Ollama running locally)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/kresearch.git
cd kresearch

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .
# Or: pip install -r requirements.txt
```

### Set Up API Keys

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your API keys
# At minimum, set one LLM provider key (e.g., OPENAI_API_KEY)
# DuckDuckGo search works without any key
```

### Run

```bash
# Start the REPL
python -m kresearch

# Or use the installed command
kresearch
```

You will see the KResearch banner:

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│  KResearch v0.1.0                                            │
│  Deep Research Agent -- Omega Workflow                       │
│                                                              │
│  Type a research query to begin, or /help for commands.      │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
```

### Run Your First Research

Simply type a research question:

```
kresearch> What are the environmental and economic trade-offs of nuclear fusion energy?
```

KResearch will execute all 5 phases automatically, showing real-time progress in the terminal, and produce a comprehensive report.

---

## Configuration

KResearch uses a layered configuration system:

```
Hardcoded Defaults  -->  ~/.kresearch/config.yaml  -->  .env  -->  Environment Variables  -->  Runtime /commands
```

Each layer overrides the previous one.

### Config File

Create `~/.kresearch/config.yaml`:

```yaml
llm:
  provider: openai
  model: gpt-4o
  temperature: 0.2
  max_tokens: 4096

search:
  provider: duckduckgo
  max_results: 10
  timeout: 30

rag:
  collection_name: kresearch
  chunk_size: 1000
  chunk_overlap: 200
  top_k: 5

sandbox:
  prefer_docker: true
  timeout: 60
  max_retries: 3

concurrency:
  global_limit: 15
  per_provider_limits:
    tavily: 5
    duckduckgo: 10

eval:
  min_score: 7.0
  max_iterations: 5

output_dir: output
```

### Environment Variable Overrides

Use the `KRESEARCH_` prefix:

```bash
export KRESEARCH_LLM_MODEL=gpt-4o-mini
export KRESEARCH_SEARCH_PROVIDER=tavily
export KRESEARCH_OUTPUT_DIR=/path/to/reports
```

---

## Slash Commands

| Command | Description | Example |
|---|---|---|
| `/model list` | List all LLM providers and models | `/model list` |
| `/model <provider> [model]` | Switch LLM provider/model | `/model anthropic claude-sonnet-4-20250514` |
| `/search list` | List all search providers | `/search list` |
| `/search <provider>` | Switch search provider | `/search duckduckgo` |
| `/config` | View current configuration | `/config` |
| `/config <key> <value>` | Set a config value | `/config eval.min_score 8.0` |
| `/export md [path]` | Export report as Markdown | `/export md ./report.md` |
| `/export json [path]` | Export report as JSON | `/export json` |
| `/rag ingest <path>` | Ingest files into ChromaDB | `/rag ingest ./papers/` |
| `/rag search <query>` | Query local vector store | `/rag search "fusion energy"` |
| `/rag status` | Show RAG store statistics | `/rag status` |
| `/status` | Show current session progress | `/status` |
| `/session info` | Current session details | `/session info` |
| `/session export` | Export session state to JSON | `/session export` |
| `/session reset` | Clear current session | `/session reset` |
| `/help` | Show all commands | `/help` |
| `/quit` | Exit KResearch | `/quit` |

---

## LLM Providers

| Provider | SDK | Models | API Key Env Var | Special |
|---|---|---|---|---|
| **OpenAI** | `openai` | gpt-4o, gpt-4o-mini, o3-mini | `OPENAI_API_KEY` | JSON mode |
| **Anthropic** | `anthropic` | claude-sonnet-4-20250514, claude-haiku-4-5-20251001 | `ANTHROPIC_API_KEY` | -- |
| **Gemini** | `google-generativeai` | gemini-2.0-flash, gemini-2.5-pro | `GOOGLE_API_KEY` | Grounding, JSON mode |
| **Grok** | `httpx` (OpenAI-compat) | grok-3, grok-3-mini | `XAI_API_KEY` | -- |
| **Perplexity** | `httpx` (OpenAI-compat) | sonar, sonar-pro | `PERPLEXITY_API_KEY` | Search-augmented |
| **DeepSeek** | `httpx` (OpenAI-compat) | deepseek-chat, deepseek-reasoner | `DEEPSEEK_API_KEY` | JSON mode |
| **Ollama** | `ollama` | llama3, mistral, phi3, gemma | *(none -- local)* | Local inference |

### Switching Providers at Runtime

```
kresearch> /model openai gpt-4o-mini
Switched to openai / gpt-4o-mini

kresearch> /model ollama llama3
Switched to ollama / llama3
```

---

## Search Providers

| Provider | Cost | API Key | Description |
|---|---|---|---|
| **DuckDuckGo** | Free | *(none)* | Default. No API key needed. Includes retry and back-off. |
| **Jina Reader** | Free tier | `JINA_API_KEY` *(optional)* | Web reader/search via Jina AI |
| **Scraper** | Free | *(none)* | Direct scraping with aiohttp + BeautifulSoup4 |
| **Tavily** | Paid | `TAVILY_API_KEY` | AI-optimized search API |
| **SerpAPI** | Paid | `SERPAPI_KEY` | Google results proxy |
| **Google CSE** | Paid | `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` | Google Custom Search Engine |
| **Gemini Grounding** | Paid | `GOOGLE_API_KEY` | Search via Gemini API grounding |

### Zero-Cost Setup

KResearch works with zero API spend using:
- **Ollama** for LLM (runs locally)
- **DuckDuckGo** for search (free, no key)

```bash
# Install Ollama (https://ollama.com)
ollama pull llama3

# Run KResearch with free providers
python -m kresearch
/model ollama llama3
/search duckduckgo
```

---

## RAG (Local Knowledge Base)

Ingest your own documents into a local ChromaDB vector store for retrieval-augmented research.

### Supported Formats

- `.txt` -- Plain text
- `.md` -- Markdown
- `.json` -- JSON documents
- `.pdf` -- PDF text extraction

### Usage

```
# Ingest a single file
kresearch> /rag ingest ./papers/fusion_energy.pdf

# Ingest an entire directory (recursive)
kresearch> /rag ingest ./research_papers/

# Search the local store
kresearch> /rag search "tokamak confinement time"

# Check store statistics
kresearch> /rag status
```

Documents are chunked (default: 1000 chars, 200 overlap) and embedded using `all-MiniLM-L6-v2` via sentence-transformers. The store persists at `~/.kresearch/chromadb/`.

---

## Code Sandbox

Phase 3 executes LLM-generated Python to verify claims. The sandbox supports two modes:

| Mode | Isolation | Setup |
|---|---|---|
| **Docker** (preferred) | Full container isolation, network disabled, 256MB memory limit | `docker` must be installed and running |
| **Subprocess** (fallback) | Process-level isolation with timeout | No setup needed |

Auto-detection: KResearch checks if Docker is available at startup. If not, it falls back to subprocess.

```yaml
# config.yaml
sandbox:
  prefer_docker: true   # Set false to always use subprocess
  timeout: 60           # Execution timeout in seconds
  max_retries: 3        # Retry count for failed verifications
```

---

## Telegram Integration

Receive real-time research updates and reports via Telegram.

### Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token
2. Get your chat ID (message [@userinfobot](https://t.me/userinfobot))
3. Add to `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

4. Enable in config:

```yaml
telegram:
  enabled: true
```

### Bot Commands

- `/start` -- Welcome message
- `/research <query>` -- Start a research session
- `/status` -- Check current progress
- `/cancel` -- Cancel current research

The bot sends updates for each phase start/complete and delivers a summary of the final report.

---

## Project Structure

```
kresearch/
├── pyproject.toml                  # Project metadata and dependencies
├── requirements.txt                # Pip requirements
├── .env.example                    # API key template
├── README.md                       # This file
├── LICENSE                         # MIT License
├── CONTRIBUTING.md                 # Contribution guidelines
│
└── kresearch/
    ├── __init__.py                 # Package version
    ├── __main__.py                 # Entry point (python -m kresearch)
    ├── app.py                      # Async REPL and orchestrator
    ├── constants.py                # Enums and constants
    │
    ├── config/                     # Configuration management
    │   ├── schema.py               #   Pydantic config models
    │   ├── loader.py               #   YAML/env/defaults merger
    │   └── defaults.py             #   Default values
    │
    ├── core/                       # Core data structures
    │   ├── session.py              #   ResearchSession container
    │   ├── mind_map.py             #   EpistemicMindMap (directed graph)
    │   ├── mind_map_node.py        #   MindMapNode with confidence levels
    │   ├── task_graph.py           #   TaskGraph DAG
    │   ├── task_node.py            #   TaskNode with dependencies
    │   ├── evidence.py             #   Source and Evidence models
    │   ├── message.py              #   LLM message types
    │   └── event_bus.py            #   Async pub/sub event bus
    │
    ├── llm/                        # LLM provider adapters (7)
    │   ├── base.py                 #   Abstract LLMProvider
    │   ├── factory.py              #   Provider factory
    │   ├── registry.py             #   Provider registry
    │   ├── models.py               #   Model name constants
    │   ├── openai_provider.py      #   OpenAI (AsyncOpenAI SDK)
    │   ├── anthropic_provider.py   #   Anthropic (AsyncAnthropic SDK)
    │   ├── gemini_provider.py      #   Google Gemini (generativeai SDK)
    │   ├── grok_provider.py        #   xAI Grok (httpx, OpenAI-compat)
    │   ├── perplexity_provider.py  #   Perplexity (httpx, OpenAI-compat)
    │   ├── deepseek_provider.py    #   DeepSeek (httpx, OpenAI-compat)
    │   └── ollama_provider.py      #   Ollama (ollama SDK, local)
    │
    ├── search/                     # Search provider adapters (7)
    │   ├── base.py                 #   Abstract SearchProvider
    │   ├── factory.py              #   Provider factory
    │   ├── registry.py             #   Provider registry
    │   ├── models.py               #   SearchResult model
    │   ├── tavily_provider.py      #   Tavily (paid)
    │   ├── duckduckgo_provider.py  #   DuckDuckGo (free, default)
    │   ├── jina_provider.py        #   Jina Reader (free tier)
    │   ├── serpapi_provider.py     #   SerpAPI (paid)
    │   ├── google_cse_provider.py  #   Google CSE (paid)
    │   ├── scraper_provider.py     #   BeautifulSoup scraper (free)
    │   └── gemini_grounding.py     #   Gemini Grounding (paid)
    │
    ├── phases/                     # 5-phase Omega Workflow
    │   ├── base.py                 #   Abstract Phase class
    │   ├── runner.py               #   PhaseRunner orchestrator
    │   ├── phase1/                 #   Metacognitive Intent Parsing
    │   │   ├── intent_parser.py
    │   │   ├── perspective_discovery.py
    │   │   ├── task_graph_builder.py
    │   │   └── mind_map_initializer.py
    │   ├── phase2/                 #   Decentralized Swarm Retrieval
    │   │   ├── swarm_coordinator.py
    │   │   ├── retrieval_agent.py
    │   │   ├── discourse_engine.py
    │   │   ├── context_compactor.py
    │   │   └── mcp_retrieval.py
    │   ├── phase3/                 #   Turing-Complete Verification
    │   │   ├── verification_engine.py
    │   │   ├── claim_extractor.py
    │   │   ├── code_verifier.py
    │   │   ├── data_verifier.py
    │   │   └── statistical_analyzer.py
    │   ├── phase4/                 #   Epistemic Conflict Resolution
    │   │   ├── conflict_detector.py
    │   │   ├── consistency_checker.py
    │   │   ├── source_hierarchy.py
    │   │   └── markov_resolver.py
    │   └── phase5/                 #   Draft-Centric Diffusion Synthesis
    │       ├── skeleton_builder.py
    │       ├── diffusion_writer.py
    │       ├── evaluation_loop.py
    │       └── finalizer.py
    │
    ├── rag/                        # Retrieval-Augmented Generation
    │   ├── store.py                #   ChromaDB vector store
    │   ├── embeddings.py           #   Embedding functions
    │   ├── chunker.py              #   Text chunking
    │   ├── ingester.py             #   File/directory ingestion
    │   └── retriever.py            #   RAG query interface
    │
    ├── sandbox/                    # Code execution sandbox
    │   ├── base.py                 #   Abstract Sandbox + ExecutionResult
    │   ├── detector.py             #   Docker auto-detection
    │   ├── subprocess_sandbox.py   #   Subprocess-based sandbox
    │   ├── docker_sandbox.py       #   Docker-based sandbox
    │   └── factory.py              #   Sandbox factory
    │
    ├── ui/                         # Rich terminal UI
    │   ├── theme.py                #   Color theme
    │   ├── console.py              #   Singleton console
    │   ├── display.py              #   DisplayManager (event-driven)
    │   ├── panels.py               #   Rich panel builders
    │   ├── progress.py             #   Progress bars
    │   ├── phase_display.py        #   Phase-specific rendering
    │   ├── mind_map_display.py     #   Mind map tree visualization
    │   └── input_handler.py        #   Input handling
    │
    ├── commands/                   # Slash command handlers
    │   ├── registry.py             #   Command registry + @command decorator
    │   ├── model_cmd.py            #   /model
    │   ├── search_cmd.py           #   /search
    │   ├── config_cmd.py           #   /config
    │   ├── export_cmd.py           #   /export
    │   ├── status_cmd.py           #   /status
    │   ├── help_cmd.py             #   /help
    │   ├── rag_cmd.py              #   /rag
    │   └── session_cmd.py          #   /session
    │
    ├── export/                     # Report exporters
    │   ├── base.py                 #   Abstract Exporter
    │   ├── markdown_exporter.py    #   Markdown with TOC + bibliography
    │   ├── json_exporter.py        #   Full JSON session export
    │   └── manager.py              #   ExportManager
    │
    ├── telegram/                   # Telegram bot integration
    │   ├── bot.py                  #   TelegramBot class
    │   ├── handlers.py             #   Command handlers
    │   ├── formatter.py            #   Message formatting
    │   └── bridge.py               #   EventBus-to-Telegram bridge
    │
    └── utils/                      # Shared utilities
        ├── text.py                 #   Text processing (truncate, slugify, JSON extraction)
        ├── async_helpers.py        #   Async utilities (gather_with_limit, semaphores)
        ├── retry.py                #   Retry with exponential back-off
        ├── rate_limiter.py         #   Rate limiter + token bucket
        ├── logger.py               #   Rich-powered logging
        └── validators.py           #   Input validation
```

**119 Python files** -- every single file is **150 lines or fewer**.

---

## Configuration Reference

### LLMConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `provider` | `str` | `"openai"` | LLM provider name |
| `model` | `str` | `"gpt-4o"` | Model identifier |
| `temperature` | `float` | `0.2` | Sampling temperature (0.0--2.0) |
| `max_tokens` | `int` | `4096` | Maximum tokens in response |
| `api_base` | `str \| null` | `null` | Custom API base URL |

### SearchConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `provider` | `str` | `"tavily"` | Search provider name |
| `max_results` | `int` | `10` | Max results per query |
| `timeout` | `int` | `30` | Request timeout in seconds |

### RAGConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `collection_name` | `str` | `"kresearch"` | ChromaDB collection name |
| `chunk_size` | `int` | `1000` | Chunk size in characters |
| `chunk_overlap` | `int` | `200` | Overlap between chunks |
| `top_k` | `int` | `5` | Number of chunks to retrieve |

### SandboxConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `prefer_docker` | `bool` | `true` | Prefer Docker over subprocess |
| `timeout` | `int` | `60` | Execution timeout in seconds |
| `max_retries` | `int` | `3` | Max retries on failure |

### EvalConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `min_score` | `float` | `7.0` | Minimum acceptable evaluation score (1--10) |
| `max_iterations` | `int` | `5` | Max draft refinement iterations |

### ConcurrencyConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `global_limit` | `int` | `15` | Maximum concurrent tasks |
| `per_provider_limits` | `dict` | `{}` | Per-provider limits (e.g., `{tavily: 5}`) |

### TelegramConfig

| Key | Type | Default | Description |
|---|---|---|---|
| `bot_token` | `str \| null` | `null` | Telegram bot token |
| `chat_id` | `str \| null` | `null` | Default chat ID |
| `enabled` | `bool` | `false` | Enable Telegram integration |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to KResearch.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

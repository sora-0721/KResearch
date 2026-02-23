# Contributing to KResearch

Thank you for your interest in contributing to KResearch! This document provides guidelines and instructions for contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Code Standards](#code-standards)
- [The 150-Line Rule](#the-150-line-rule)
- [Adding a New LLM Provider](#adding-a-new-llm-provider)
- [Adding a New Search Provider](#adding-a-new-search-provider)
- [Adding a New Slash Command](#adding-a-new-slash-command)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

Be respectful, constructive, and inclusive. We are all here to build something great together.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/yourusername/kresearch.git
   cd kresearch
   ```
3. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/my-new-feature
   ```
4. **Set up** the development environment (see below)
5. **Make changes**, ensuring all standards are met
6. **Submit** a pull request

---

## Development Setup

### Prerequisites

- Python 3.11+
- Git
- (Optional) Docker for sandbox testing
- (Optional) Ollama for local LLM testing

### Install Dependencies

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install in development mode
pip install -e .

# Or install from requirements
pip install -r requirements.txt
```

### Set Up Environment

```bash
# Copy the environment template
cp .env.example .env

# Add at least one LLM API key for testing
# DuckDuckGo search works without any key
```

### Verify Installation

```bash
# Run the REPL
python -m kresearch

# Check that all modules import correctly
python -c "
from kresearch.config import load_config
from kresearch.core import EventBus, ResearchSession, EpistemicMindMap, TaskGraph
from kresearch.llm.models import ALL_MODELS
from kresearch.search.models import SEARCH_PROVIDERS
from kresearch.commands.registry import get_all_commands
print('All imports OK')
print(f'LLM providers: {list(ALL_MODELS.keys())}')
print(f'Search providers: {list(SEARCH_PROVIDERS.keys())}')
print(f'Commands: {list(get_all_commands().keys())}')
"
```

---

## Architecture Overview

KResearch follows a **hexagonal (ports & adapters)** architecture:

- **Core** (`kresearch/core/`) -- Domain models (session, mind map, task graph, events). No external dependencies.
- **Ports** -- Abstract base classes (`llm/base.py`, `search/base.py`, `sandbox/base.py`, `export/base.py`)
- **Adapters** -- Concrete implementations (each provider file)
- **Phases** (`kresearch/phases/`) -- Business logic for the 5-phase workflow
- **UI** (`kresearch/ui/`) -- Terminal rendering, decoupled via EventBus
- **Commands** (`kresearch/commands/`) -- Slash command handlers

### Key Design Principles

1. **Dependency flows inward** -- Core has no knowledge of adapters or UI
2. **EventBus decouples** -- Phases publish events; UI and Telegram subscribe independently
3. **Factory pattern** -- All providers are instantiated via factories using registries
4. **Async-first** -- All I/O operations are async; sync SDKs are wrapped with `asyncio.to_thread()`
5. **Graceful degradation** -- Missing optional dependencies (Docker, Telegram, ChromaDB) never crash the app

---

## Code Standards

### Style

- **Line length**: 100 characters maximum (configured in `pyproject.toml` for Ruff)
- **Type hints**: Use type annotations on all function signatures
- **Imports**: Use `from __future__ import annotations` at the top of every file
- **Docstrings**: Required for all public classes and functions
- **Naming**: snake_case for functions/variables, PascalCase for classes, UPPER_CASE for constants

### Tools

```bash
# Format and lint (if ruff is installed)
ruff check kresearch/ --fix
ruff format kresearch/

# Type check (if mypy is installed)
mypy kresearch/
```

### Error Handling

- Use `try/except` around external API calls and optional imports
- Log errors with `kresearch.utils.logger.get_logger(__name__)`
- Never let one failed task crash the entire pipeline -- use `return_exceptions=True` in `asyncio.gather()`
- Provide meaningful error messages to the user via Rich panels

---

## The 150-Line Rule

**Every Python file in KResearch must be 150 lines or fewer.** This is a hard constraint.

### Why?

- Forces modular, focused code
- Makes files easy to read and review
- Encourages separation of concerns
- Keeps the codebase maintainable

### How to Stay Under 150 Lines

- **One responsibility per file** -- If a file does two distinct things, split it
- **Extract helpers** -- Move utility functions to `kresearch/utils/`
- **Use composition** -- Delegate to other modules instead of inlining logic
- **Minimal comments** -- Use clear names instead of verbose comments
- **No boilerplate** -- Use dataclasses, Pydantic models, and decorators to reduce repetition

### Verify

```bash
# Check that no file exceeds 150 lines
find kresearch -name "*.py" -exec wc -l {} + | awk '$1 > 150 && !/total/ {print "OVER LIMIT:", $0}'
```

---

## Adding a New LLM Provider

1. **Create the provider file** at `kresearch/llm/<name>_provider.py` (max 150 lines)

2. **Implement the `LLMProvider` interface**:

```python
"""<Name> LLM provider for KResearch."""

from __future__ import annotations

import os
from typing import AsyncIterator

from kresearch.llm.base import LLMProvider
from kresearch.llm.registry import register


class MyProvider(LLMProvider):
    """<Name> LLM provider."""

    def __init__(self, api_key: str | None = None, **kwargs):
        self._api_key = api_key or os.environ.get("MY_API_KEY", "")

    @property
    def name(self) -> str:
        return "myprovider"

    @property
    def available_models(self) -> list[str]:
        return ["model-a", "model-b"]

    def is_available(self) -> bool:
        return bool(self._api_key)

    def supports_json_mode(self) -> bool:
        return False

    async def complete(self, messages, model, temperature=0.2,
                       max_tokens=4096, json_mode=False,
                       system_prompt=None) -> dict:
        # Implement API call
        return {"content": "...", "model": model,
                "usage": {"input_tokens": 0, "output_tokens": 0}}

    async def stream(self, messages, model, temperature=0.2,
                     max_tokens=4096,
                     system_prompt=None) -> AsyncIterator[str]:
        # Implement streaming
        yield "..."


# Self-register at import time
register("myprovider", MyProvider)
```

3. **Add models** to `kresearch/llm/models.py`:

```python
MY_MODELS = ["model-a", "model-b"]
# Add to ALL_MODELS and DEFAULT_MODELS dicts
```

4. **Import in `__init__.py`** -- Add `from kresearch.llm import myprovider` to trigger registration

5. **Add the API key** to `.env.example` and update `kresearch/config/loader.py`'s `_API_KEY_MAP`

---

## Adding a New Search Provider

1. **Create the provider file** at `kresearch/search/<name>_provider.py` (max 150 lines)

2. **Implement the `SearchProvider` interface**:

```python
"""<Name> search provider for KResearch."""

from __future__ import annotations

from kresearch.search.base import SearchProvider
from kresearch.search.registry import register


class MySearchProvider(SearchProvider):
    """<Name> search provider."""

    @property
    def name(self) -> str:
        return "mysearch"

    @property
    def is_free(self) -> bool:
        return True  # or False

    def is_available(self) -> bool:
        return True

    async def search(self, query: str, max_results: int = 10) -> list[dict]:
        # Return list of {title, url, snippet, source}
        return [
            {
                "title": "Result",
                "url": "https://example.com",
                "snippet": "Some text...",
                "source": "mysearch",
            }
        ]


register("mysearch", MySearchProvider)
```

3. **Add to `search/models.py`** -- Update `SEARCH_PROVIDERS` dict and optionally `FREE_PROVIDERS` set

4. **Import in `__init__.py`** -- Add the import to trigger registration

---

## Adding a New Slash Command

1. **Create the command file** at `kresearch/commands/<name>_cmd.py` (max 150 lines)

2. **Use the `@command` decorator**:

```python
"""My custom command for KResearch."""

from __future__ import annotations

from kresearch.commands.registry import command


@command("mycommand", "Description of what it does")
async def handle_mycommand(args: str, ctx: dict) -> None:
    """Handle the /mycommand slash command."""
    config = ctx["config"]
    session = ctx.get("session")

    if not args:
        # Show usage
        print("Usage: /mycommand <argument>")
        return

    # Implement your command logic
    print(f"Running mycommand with: {args}")
```

3. **Add the import** to `kresearch/commands/registry.py`'s `_ensure_commands_loaded()` function

The command is now available as `/mycommand` in the REPL and shows up in `/help`.

---

## Testing

### Manual Testing

```bash
# Start REPL and test commands
python -m kresearch
/help
/model list
/search list
/config
/status

# Test with a simple query (requires at least one LLM + search provider)
# Type a research query and observe 5-phase execution
```

### Syntax Verification

```bash
# Verify all files parse correctly
python -c "
import ast, glob
errors = []
for f in sorted(glob.glob('kresearch/**/*.py', recursive=True)):
    try:
        ast.parse(open(f).read())
    except SyntaxError as e:
        errors.append(f'{f}: {e}')
if errors:
    for e in errors:
        print(f'ERROR: {e}')
else:
    total = len(glob.glob('kresearch/**/*.py', recursive=True))
    print(f'All {total} files pass syntax check')
"
```

### Import Verification

```bash
# Verify all modules can be imported
python -c "
from kresearch.config import load_config
from kresearch.core import EventBus, ResearchSession
from kresearch.llm.models import ALL_MODELS
from kresearch.search.models import SEARCH_PROVIDERS
from kresearch.commands.registry import get_all_commands
from kresearch.phases.runner import PhaseRunner
from kresearch.export.manager import ExportManager
from kresearch.sandbox.base import Sandbox, ExecutionResult
from kresearch.rag.store import RAGStore
from kresearch.telegram.formatter import escape_markdown
from kresearch.ui.console import get_console
print('All module imports successful')
"
```

### Line Count Verification

```bash
# Ensure no file exceeds 150 lines
find kresearch -name "*.py" -exec wc -l {} + | sort -rn | head -5
find kresearch -name "*.py" -exec wc -l {} + | awk '$1 > 150 && !/total/ {print "VIOLATION:", $0}'
```

---

## Submitting Changes

### Pull Request Process

1. **Ensure all checks pass**:
   - All files parse without syntax errors
   - All modules import successfully
   - No file exceeds 150 lines
   - Code follows the style guidelines

2. **Write a clear PR description**:
   - What does this change do?
   - Why is it needed?
   - How was it tested?

3. **Keep PRs focused** -- One feature or fix per PR

4. **Update documentation** if your change adds new features, commands, or providers

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add Cohere LLM provider
fix: handle timeout in DuckDuckGo search retry
docs: add RAG configuration examples to README
refactor: extract common httpx logic from OpenAI-compat providers
```

### PR Checklist

- [ ] All files are 150 lines or fewer
- [ ] All syntax checks pass
- [ ] All module imports work
- [ ] New providers self-register at import time
- [ ] New commands appear in `/help`
- [ ] `.env.example` updated if new API keys are needed
- [ ] Documentation updated if applicable

---

## Reporting Issues

When reporting a bug, please include:

1. **Python version** (`python --version`)
2. **OS** (macOS, Linux, Windows)
3. **Steps to reproduce** the issue
4. **Expected behavior** vs. **actual behavior**
5. **Error output** (full traceback if available)
6. **Configuration** (provider, model, search engine -- redact API keys)

For feature requests, describe:

1. **The use case** -- What are you trying to accomplish?
2. **Current workaround** (if any)
3. **Proposed solution** -- How would you like it to work?

---

Thank you for contributing to KResearch!

"""KResearch CLI entry point.

Run with: python -m kresearch
"""

import sys


def main() -> None:
    """Main entry point for the KResearch CLI."""
    try:
        from kresearch.app import main as app_main

        app_main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        sys.exit(130)
    except Exception as exc:
        print(f"Fatal error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

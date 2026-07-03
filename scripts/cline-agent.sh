#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$SCRIPT_DIR/../.venv/bin/python"
AGENT_SCRIPT="$SCRIPT_DIR/cline-agent.py"

if [ ! -x "$PYTHON" ]; then
  echo "Python virtual environment not found at $PYTHON" >&2
  echo "Create it with: python -m venv .venv" >&2
  exit 1
fi

if [ ! -f "$AGENT_SCRIPT" ]; then
  echo "Agent script not found at $AGENT_SCRIPT" >&2
  exit 1
fi

exec "$PYTHON" "$AGENT_SCRIPT" "$@"

#!/usr/bin/env bash
# Stop hook — warns when context window usage is high, reminding dev to run /compact.

USAGE="${CLAUDE_CODE_CONTEXT_WINDOW_USAGE_PERCENT:-0}"
USAGE_INT="${USAGE%.*}"

if [ "${USAGE_INT}" -ge 70 ] 2>/dev/null; then
  echo ""
  echo "[context] ${USAGE}% used — run /compact to reduce context and save tokens before continuing."
fi

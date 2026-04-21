#!/usr/bin/env bash
# PostToolUse hook — runs tsc --noEmit after file edits in TypeScript projects.
# Exits silently on success; prints errors and exits 1 on failure.

if ! command -v jq &>/dev/null; then
  exit 0
fi

TOOL_NAME=$(cat | jq -r '.tool_name // empty')

# Only trigger on file write/edit tools
case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

# Only run if this is a TypeScript project
if [ ! -f "tsconfig.json" ]; then
  exit 0
fi

# Run tsc, suppress success output, surface errors only
OUTPUT=$(tsc --noEmit --pretty false 2>&1) || {
  echo "$OUTPUT"
  exit 1
}

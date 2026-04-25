#!/usr/bin/env bash
# PostToolUse hook — runs tsc --noEmit after file edits in TypeScript projects.
# Exits silently on success; prints errors and exits 1 on failure.

# Only run if this is a TypeScript project
if [ ! -f "tsconfig.json" ]; then
  exit 0
fi

# Prefer local tsc (installed by setup-app.sh); fall back to global
TSC="./node_modules/.bin/tsc"
[ -x "$TSC" ] || TSC="tsc"
command -v "$TSC" &>/dev/null || exit 0

# Run tsc, suppress success output, surface errors only
OUTPUT=$("$TSC" --noEmit --pretty false 2>&1) || {
  echo "$OUTPUT"
  exit 1
}

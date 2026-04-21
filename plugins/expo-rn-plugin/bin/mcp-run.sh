#!/usr/bin/env bash
# Doppler-aware MCP server runner for expo-rn-plugin.
# Uses userConfig values exposed as CLAUDE_PLUGIN_OPTION_* env vars.
# Falls back to .mcp-project / .mcp-env files in the working directory for
# backwards compatibility with projects bootstrapped before the plugin.
set -euo pipefail

PROJECT="${CLAUDE_PLUGIN_OPTION_DOPPLER_PROJECT:-}"
CONFIG="${CLAUDE_PLUGIN_OPTION_DOPPLER_CONFIG:-}"

# Fall back to per-project files (legacy bootstrap path)
if [ -z "$PROJECT" ] && [ -f ".mcp-project" ]; then
  PROJECT=$(tr -d '[:space:]' < .mcp-project)
fi
if [ -z "$CONFIG" ] && [ -f ".mcp-env" ]; then
  CONFIG=$(tr -d '[:space:]' < .mcp-env)
fi
CONFIG="${CONFIG:-dev}"

if [ -z "$PROJECT" ]; then
  echo "[expo-rn-plugin] ERROR: Doppler project not configured." >&2
  echo "[expo-rn-plugin] Either configure via '/plugin configure expo-rn-plugin'" >&2
  echo "[expo-rn-plugin] or create a .mcp-project file in your project root." >&2
  exit 1
fi

exec doppler run -p "$PROJECT" -c "$CONFIG" -- \
  sh -c '
    export SUPABASE_URL="${SERVER_URL:-}" SENTRY_ACCESS_TOKEN="${SENTRY_AUTH_TOKEN:-}"
    args=()
    for arg in "$@"; do
      args+=("${arg/\$\{SENTRY_ORG\}/${SENTRY_ORG:-}}")
    done
    exec "${args[@]}"
  ' -- "$@"

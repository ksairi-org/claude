#!/usr/bin/env bash
# Doppler-aware MCP server runner for expo-rn-plugin.
# Uses userConfig values exposed as CLAUDE_PLUGIN_OPTION_* env vars,
# with fallback to mcp.config.json in the project root.
set -euo pipefail

PROJECT="${CLAUDE_PLUGIN_OPTION_DOPPLER_PROJECT:-}"
CONFIG="${CLAUDE_PLUGIN_OPTION_DOPPLER_CONFIG:-}"

if [ -z "$PROJECT" ] && [ -f "$PWD/mcp.config.json" ]; then
  PROJECT=$(python3 -c "import json; d=json.load(open('$PWD/mcp.config.json')); print(d.get('doppler',{}).get('project',''))" 2>/dev/null || echo "")
  CONFIG=$(python3 -c "import json; d=json.load(open('$PWD/mcp.config.json')); print(d.get('doppler',{}).get('config','dev'))" 2>/dev/null || echo "")
fi

CONFIG="${CONFIG:-dev}"

if [ -z "$PROJECT" ]; then
  echo "[expo-rn-plugin] ERROR: Doppler project not configured." >&2
  echo "[expo-rn-plugin] Add a \"doppler\" section to mcp.config.json or configure the plugin's userConfig." >&2
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

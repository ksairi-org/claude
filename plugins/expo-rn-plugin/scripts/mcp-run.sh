#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

MCP_ENV_FILE="$PROJECT_DIR/.mcp-env"
MCP_PROJECT_FILE="$PROJECT_DIR/.mcp-project"

ENV=$([ -f "$MCP_ENV_FILE" ] && tr -d '[:space:]' < "$MCP_ENV_FILE" || echo "stg")
PROJECT=$([ -f "$MCP_PROJECT_FILE" ] && tr -d '[:space:]' < "$MCP_PROJECT_FILE" || echo "")

if [ -z "$PROJECT" ]; then
  echo "[mcp-run] ERROR: .mcp-project file not found in $PROJECT_DIR" >&2
  echo "[mcp-run] Create it with: echo 'your-doppler-project' > .mcp-project" >&2
  exit 1
fi

exec doppler run -p "$PROJECT" -c "$ENV" -- \
  sh -c '
    export SUPABASE_URL="$SERVER_URL" SENTRY_ACCESS_TOKEN="$SENTRY_AUTH_TOKEN"
    args=()
    for arg in "$@"; do
      args+=("${arg/\$\{SENTRY_ORG\}/$SENTRY_ORG}")
    done
    exec "${args[@]}"
  ' -- "$@"

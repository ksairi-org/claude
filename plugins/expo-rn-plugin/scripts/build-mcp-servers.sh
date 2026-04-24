#!/usr/bin/env bash
# SessionStart hook — rebuilds MCP servers whenever package.json changes (plugin update).
set -euo pipefail

if ! command -v node >/dev/null 2>&1 || ! command -v yarn >/dev/null 2>&1; then
  echo "[expo-rn-plugin] WARNING: node/yarn not found — skipping MCP server build" >&2
  exit 0
fi

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:?CLAUDE_PLUGIN_ROOT is not set}"

build_server() {
  local src="$PLUGIN_ROOT/mcps/$1"
  local marker="$src/.built"

  if diff -q "$src/package.json" "$marker" >/dev/null 2>&1; then
    return 0
  fi

  echo "[expo-rn-plugin] Building $1..."
  (cd "$src" && yarn --silent install --prefer-offline && yarn --silent build) || {
    echo "[expo-rn-plugin] ERROR: failed to build $1" >&2
    return 1
  }
  cp "$src/package.json" "$marker"
  echo "[expo-rn-plugin] $1 ready"
}

build_server "expo-mcp-server"
build_server "database-mcp-server"

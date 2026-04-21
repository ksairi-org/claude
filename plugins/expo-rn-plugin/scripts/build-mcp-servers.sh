#!/usr/bin/env bash
# SessionStart hook — builds MCP servers into ${CLAUDE_PLUGIN_DATA} on first run
# and whenever the bundled package.json changes (plugin update).
set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
DATA="${CLAUDE_PLUGIN_DATA}"
mkdir -p "$DATA"

build_server() {
  local src="$1"
  local name
  name=$(basename "$src")
  local marker="$DATA/${name}-built"

  if diff -q "$PLUGIN_ROOT/$src/package.json" "$marker" >/dev/null 2>&1; then
    return 0
  fi

  echo "[expo-rn-plugin] Building $name..."
  rm -rf "$DATA/$name"
  cp -r "$PLUGIN_ROOT/$src" "$DATA/"
  (cd "$DATA/$name" && npm install --prefer-offline --silent && npm run build --silent) || {
    rm -rf "$DATA/$name" "$marker"
    echo "[expo-rn-plugin] ERROR: failed to build $name" >&2
    return 1
  }
  cp "$PLUGIN_ROOT/$src/package.json" "$marker"
  echo "[expo-rn-plugin] $name ready"
}

build_server "mcps/expo-mcp-server"
build_server "mcps/supabase-mcp-server"

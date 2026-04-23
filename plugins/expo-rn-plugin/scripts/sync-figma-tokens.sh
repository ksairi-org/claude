#!/usr/bin/env bash
# Syncs Figma design tokens to src/theme/ when FIGMA_FILE_ID and FIGMA_API_KEY are set.
# Runs silently if not configured so it's safe on apps without Figma integration.
# Skips the sync if tokens were already synced within the last 10 minutes.
set -uo pipefail

FIGMA_FILE_ID="${FIGMA_FILE_ID:-}"
FIGMA_TOKEN="${FIGMA_API_KEY:-${FIGMA_TOKEN:-}}"
CACHE_FILE="${TMPDIR:-/tmp}/.figma-tamagui-sync-last-run"
CACHE_TTL=600  # seconds (10 minutes)

if [ -z "$FIGMA_FILE_ID" ] || [ -z "$FIGMA_TOKEN" ]; then
  exit 0
fi

if ! command -v figma-tamagui-sync &>/dev/null; then
  exit 0
fi

# Skip if synced recently to avoid redundant API calls on quick session restarts.
if [ -f "$CACHE_FILE" ]; then
  last_run=$(cat "$CACHE_FILE" 2>/dev/null || echo 0)
  now=$(date +%s)
  if (( now - last_run < CACHE_TTL )); then
    echo "[figma-sync] Skipping — synced $(( (now - last_run) / 60 ))m ago (TTL ${CACHE_TTL}s)."
    exit 0
  fi
fi

echo "[figma-sync] Syncing design tokens from Figma..."

# Run sync but don't let failures abort the hook chain.
if FIGMA_TOKEN="$FIGMA_TOKEN" figma-tamagui-sync \
    --fileId="$FIGMA_FILE_ID" \
    --out="./src/theme"; then
  date +%s > "$CACHE_FILE"
  echo "[figma-sync] Done."
else
  echo "[figma-sync] Warning: sync failed (network issue or paid plan required). Continuing with existing tokens." >&2
fi

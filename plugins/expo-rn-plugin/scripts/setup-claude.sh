#!/usr/bin/env bash
set -euo pipefail

ensure_yarn() {
  if command -v yarn &>/dev/null; then
    return 0
  fi

  echo "yarn not found — attempting to enable via corepack..."

  if command -v corepack &>/dev/null; then
    corepack enable
    corepack prepare yarn@stable --activate
    echo "yarn installed via corepack."
    return 0
  fi

  # corepack unavailable — requires Node.js 16.9+ (plugin requires Node 18+)
  echo "ERROR: corepack not found. Install Node.js 18+ to get corepack, then re-run."
  exit 1
}

ensure_yarn

PLUGINS=(
  "compound-engineering@compound-engineering-plugin"
  "expo@claude-plugins-official"
  "expo@expo-plugins"
  "github@claude-plugins-official"
)

if ! command -v claude &>/dev/null; then
  echo "Claude CLI not found — skipping plugin installation."
  echo "Install Claude Code, then re-run this script."
  exit 0
fi

echo "Installing Claude Code plugins..."
for plugin in "${PLUGINS[@]}"; do
  if claude plugin list 2>/dev/null | grep -qF "$plugin"; then
    echo "  already installed: $plugin"
  else
    echo "  installing: $plugin"
    claude plugin install "$plugin"
  fi
done

echo "Done. Claude Code plugins are ready."

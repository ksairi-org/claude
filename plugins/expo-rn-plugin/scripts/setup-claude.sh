#!/usr/bin/env bash
set -euo pipefail

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
  name="${plugin%%@*}"
  if claude plugin list 2>/dev/null | grep -q "$name"; then
    echo "  already installed: $plugin"
  else
    echo "  installing: $plugin"
    claude plugin install "$plugin"
  fi
done

echo "Done. Claude Code plugins are ready."

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

  # corepack unavailable — ask the user
  echo ""
  echo "yarn is recommended over npm for projects using this plugin."
  echo "corepack is not available (requires Node.js 16.9+)."
  echo ""

  # Skip prompt in non-interactive environments
  if [ ! -t 0 ]; then
    echo "Non-interactive shell detected — continuing with npm."
    return 0
  fi

  read -r -p "Install yarn now via npm? [y/N] (or press Enter to continue with npm): " choice
  case "$choice" in
    [yY]*)
      npm install -g yarn
      echo "yarn installed."
      ;;
    *)
      echo "Continuing with npm. You can install yarn later: https://yarnpkg.com/getting-started/install"
      ;;
  esac
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
  name="${plugin%%@*}"
  if claude plugin list 2>/dev/null | grep -q "$name"; then
    echo "  already installed: $plugin"
  else
    echo "  installing: $plugin"
    claude plugin install "$plugin"
  fi
done

echo "Done. Claude Code plugins are ready."

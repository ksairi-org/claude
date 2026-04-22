#!/usr/bin/env bash
# Installs git hooks for this repo. Run once after cloning.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_DIR="$REPO_ROOT/scripts"

install_hook() {
  local name="$1"
  local src="$SCRIPTS_DIR/hooks/$name"
  local dst="$HOOKS_DIR/$name"

  cp "$src" "$dst"
  chmod +x "$dst"
  echo "Installed $name hook"
}

install_hook "pre-push"
echo "Done. Git hooks installed."

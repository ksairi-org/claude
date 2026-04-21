#!/usr/bin/env bash
set -euo pipefail

MCPS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$HOME/.claude/hooks"
SETTINGS="$HOME/.claude/settings.json"

echo "Setting up RTK (Rust Token Killer)..."

# Install rtk binary
if command -v rtk &>/dev/null; then
  echo "  rtk already installed: $(rtk --version 2>/dev/null || echo 'unknown version')"
else
  if ! command -v cargo &>/dev/null; then
    echo ""
    echo "  ERROR: Rust/cargo not found. Install it first:"
    echo "    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "  Then re-run this script."
    exit 1
  fi
  echo "  Installing rtk via cargo..."
  cargo install rtk
fi

# Install hook scripts
mkdir -p "$HOOKS_DIR"

cp "$MCPS_DIR/hooks/rtk-rewrite.sh" "$HOOKS_DIR/rtk-rewrite.sh"
chmod +x "$HOOKS_DIR/rtk-rewrite.sh"
echo "  Hook installed: $HOOKS_DIR/rtk-rewrite.sh"

cp "$MCPS_DIR/hooks/tsc-check.sh" "$HOOKS_DIR/tsc-check.sh"
chmod +x "$HOOKS_DIR/tsc-check.sh"
echo "  Hook installed: $HOOKS_DIR/tsc-check.sh"

# Patch ~/.claude/settings.json
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

if ! command -v jq &>/dev/null; then
  echo "  WARNING: jq not found — skipping automatic settings.json patch."
  echo "  Add this manually to $SETTINGS:"
  echo '  "hooks": { "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "'"$HOOKS_DIR/rtk-rewrite.sh"'" }] }] }'
  exit 0
fi

RTK_HOOK_EXISTS=$(jq --arg hook "$HOOKS_DIR/rtk-rewrite.sh" \
  '[.hooks.PreToolUse[]?.hooks[]? | select(.command == $hook)] | length' \
  "$SETTINGS" 2>/dev/null || echo "0")

if [ "$RTK_HOOK_EXISTS" -gt 0 ]; then
  echo "  RTK hook already registered in $SETTINGS"
else
  UPDATED=$(jq --arg hook "$HOOKS_DIR/rtk-rewrite.sh" '
    .hooks.PreToolUse = ((.hooks.PreToolUse // []) + [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": $hook }]
    }])
  ' "$SETTINGS")
  echo "$UPDATED" > "$SETTINGS"
  echo "  RTK hook registered in $SETTINGS"
fi

TSC_HOOK_EXISTS=$(jq --arg hook "$HOOKS_DIR/tsc-check.sh" \
  '[.hooks.PostToolUse[]?.hooks[]? | select(.command == $hook)] | length' \
  "$SETTINGS" 2>/dev/null || echo "0")

if [ "$TSC_HOOK_EXISTS" -gt 0 ]; then
  echo "  tsc hook already registered in $SETTINGS"
else
  UPDATED=$(jq --arg hook "$HOOKS_DIR/tsc-check.sh" '
    .hooks.PostToolUse = ((.hooks.PostToolUse // []) + [{
      "matcher": "Edit|Write|MultiEdit",
      "hooks": [{ "type": "command", "command": $hook }]
    }])
  ' "$SETTINGS")
  echo "$UPDATED" > "$SETTINGS"
  echo "  tsc hook registered in $SETTINGS"
fi

echo ""
echo "RTK setup complete. All Bash commands will be auto-rewritten for token savings."

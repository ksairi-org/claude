#!/usr/bin/env bash
# One-time setup for a new Expo app using this plugin.
# Run from the app root: bash <plugin-root>/scripts/setup-app.sh
set -euo pipefail

APP_ROOT="${1:-$PWD}"
PKG="$APP_ROOT/package.json"
ENV_TEMPLATE="$APP_ROOT/env.template.yaml"

if [ ! -f "$PKG" ]; then
  echo "Error: no package.json found in $APP_ROOT"
  exit 1
fi

echo "=== expo-rn-plugin app setup ==="

# ── 0. Required system dependencies ─────────────────────────────────────────
ensure_brew_pkg() {
  local pkg="$1" tap="${2:-}"
  if command -v "$pkg" &>/dev/null; then
    echo "  ✓ $pkg already installed"
    return
  fi
  if ! command -v brew &>/dev/null; then
    echo "  ERROR: Homebrew not found. Install it first: https://brew.sh"
    exit 1
  fi
  echo "  Installing $pkg..."
  [ -n "$tap" ] && brew tap "$tap"
  brew install "$pkg"
}

ensure_brew_pkg jq
ensure_brew_pkg doppler dopplerhq/cli

# ── 1. Link figma-tamagui-sync CLI ───────────────────────────────────────────
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC_TOOL="$PLUGIN_ROOT/tools/figma-tamagui-sync"

echo "→ Linking figma-tamagui-sync CLI..."
(cd "$SYNC_TOOL" && yarn link --silent)
echo "   Linked: $(which figma-tamagui-sync)"

cd "$APP_ROOT"

# ── 2. package.json scripts ──────────────────────────────────────────────────
echo "→ Patching package.json scripts..."

# Inject sync-design-tokens script if not already present
if ! node -e "process.exit(require('./package.json').scripts['sync-design-tokens'] ? 0 : 1)" 2>/dev/null; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.scripts['sync-design-tokens'] =
      'FIGMA_TOKEN=\$FIGMA_API_KEY figma-tamagui-sync --fileId=\$FIGMA_FILE_ID --out=./src/theme';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "   Added: sync-design-tokens"
else
  echo "   Already present: sync-design-tokens"
fi

# Prepend yarn sync-design-tokens to pre-start if not already there
if node -e "process.exit(require('./package.json').scripts['pre-start'] ? 0 : 1)" 2>/dev/null; then
  if ! node -e "process.exit(require('./package.json').scripts['pre-start'].includes('sync-design-tokens') ? 0 : 1)" 2>/dev/null; then
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      pkg.scripts['pre-start'] = 'yarn sync-design-tokens; ' + pkg.scripts['pre-start'];
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "   Patched: pre-start now runs sync-design-tokens first"
  else
    echo "   Already patched: pre-start"
  fi
fi

# ── 3. env.template.yaml ─────────────────────────────────────────────────────
if [ -f "$ENV_TEMPLATE" ]; then
  if ! grep -q "FIGMA_FILE_ID" "$ENV_TEMPLATE"; then
    echo "→ Adding FIGMA_FILE_ID to env.template.yaml..."
    echo "FIGMA_FILE_ID={{ .FIGMA_FILE_ID }}" >> "$ENV_TEMPLATE"
  else
    echo "→ FIGMA_FILE_ID already in env.template.yaml"
  fi
else
  echo "→ No env.template.yaml found — skipping (add FIGMA_FILE_ID to your env config manually)"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "Done. Next steps:"
echo "  1. Set FIGMA_FILE_ID in Doppler (get it from your Figma file URL):"
echo "     doppler secrets set FIGMA_FILE_ID=\"<id>\" --project <project> --config dev"
echo "  2. Sync env: yarn sync-env-vars dev"
echo "  3. Run yarn sync-design-tokens to generate src/theme/ token files."

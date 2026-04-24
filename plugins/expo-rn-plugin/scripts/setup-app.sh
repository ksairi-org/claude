#!/usr/bin/env bash
# One-time setup for a new Expo app using this plugin.
# Run from the app root: bash <plugin-root>/scripts/setup-app.sh
set -euo pipefail

APP_ROOT="${1:-$PWD}"
PKG="$APP_ROOT/package.json"
ENV_TEMPLATE="$APP_ROOT/env.template.yaml"
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

# ── 1. Copy templates (skip files that already exist) ────────────────────────
echo "→ Copying templates..."

copy_if_missing() {
  local src="$1" dst="$2"
  if [ -e "$dst" ]; then
    echo "   Skipped (exists): $dst"
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "   Copied: $dst"
  fi
}

copy_if_missing "$PLUGIN_ROOT/templates/.mcp.json"                        "$APP_ROOT/.mcp.json"
copy_if_missing "$PLUGIN_ROOT/templates/CLAUDE.md"                        "$APP_ROOT/CLAUDE.md"
copy_if_missing "$PLUGIN_ROOT/templates/mcp.config.json"                  "$APP_ROOT/mcp.config.json"
copy_if_missing "$PLUGIN_ROOT/templates/.claude/settings.json"            "$APP_ROOT/.claude/settings.json"

# Copy commands (each individually so existing ones are preserved)
for cmd in "$PLUGIN_ROOT/templates/.claude/commands/"*; do
  [ -f "$cmd" ] && copy_if_missing "$cmd" "$APP_ROOT/.claude/commands/$(basename "$cmd")"
done

# ── 2. Link figma-tamagui-sync CLI ───────────────────────────────────────────
SYNC_TOOL="$PLUGIN_ROOT/tools/figma-tamagui-sync"

echo "→ Linking figma-tamagui-sync CLI..."
(cd "$SYNC_TOOL" && yarn link --silent)
echo "   Linked: $(which figma-tamagui-sync 2>/dev/null || echo 'not on PATH yet — restart shell')"

cd "$APP_ROOT"

# ── 3. package.json scripts ──────────────────────────────────────────────────
echo "→ Patching package.json scripts..."

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

# ── 4. env.template.yaml ─────────────────────────────────────────────────────
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

# ── 5. LSP ───────────────────────────────────────────────────────────────────
LSP_FILE="$APP_ROOT/.lsp.json"
if [ ! -f "$LSP_FILE" ]; then
  echo "→ Creating .lsp.json..."
  cat > "$LSP_FILE" <<'JSON'
{
  "languages": [
    {
      "language": "typescript",
      "command": ["./node_modules/.bin/typescript-language-server", "--stdio"]
    }
  ]
}
JSON
  echo "   Created: .lsp.json"
  echo "   Run: yarn add -D typescript-language-server"
else
  echo "→ .lsp.json already exists"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Done. Next steps:"
echo "  1. Edit CLAUDE.md — fill in project name and context"
echo "  2. Edit mcp.config.json — adjust component paths for your project structure"
echo "  3. Set secrets in Doppler, then: yarn sync-env-vars dev"
echo "     Required: FIGMA_API_KEY, FIGMA_FILE_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
echo "  4. yarn add -D typescript-language-server  (if not already installed)"
echo "  5. Start Claude: claude"

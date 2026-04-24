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

# Optional CLI checks (non-blocking)
for _cli in eas supabase; do
  command -v "$_cli" &>/dev/null || echo "  ⚠ $_cli not found — install if using EAS builds / Supabase migrations"
done
unset _cli

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

# ── 1b. Patch CLAUDE.md with project name ────────────────────────────────────
echo "→ Patching CLAUDE.md..."
APP_NAME=$(node -e "console.log(require('$PKG').name || 'My App')")
if grep -q "^# Project Name$" "$APP_ROOT/CLAUDE.md"; then
  sed -i '' "s/^# Project Name$/# ${APP_NAME}/" "$APP_ROOT/CLAUDE.md"
  echo "   Set project name: ${APP_NAME}"
else
  echo "   Already patched"
fi

# ── 1c. Detect directory structure and patch mcp.config.json ─────────────────
echo "→ Detecting project structure for mcp.config.json..."
node -e "
  const fs = require('fs');
  const cfg = JSON.parse(fs.readFileSync('$APP_ROOT/mcp.config.json', 'utf8'));
  const exists = (p) => fs.existsSync('$APP_ROOT/' + p);

  // routesDir
  if (exists('app')) cfg.routesDir = 'app';
  else if (exists('src/app')) cfg.routesDir = 'src/app';

  // components — prefer atomised layout, fall back to flat
  const compBases = ['src/components', 'components'];
  for (const base of compBases) {
    if (exists(base)) {
      for (const tier of ['atoms','molecules','organisms','screens']) {
        cfg.components[tier] = exists(base + '/' + tier)
          ? base + '/' + tier
          : base;
      }
      break;
    }
  }

  // orval generated SDK
  if (exists('src/api/generated')) cfg.orval.sdkLib = 'src/api/generated';
  else if (exists('src/generated')) cfg.orval.sdkLib = 'src/generated';

  fs.writeFileSync('$APP_ROOT/mcp.config.json', JSON.stringify(cfg, null, 2) + '\n');
  console.log('   routesDir  :', cfg.routesDir);
  console.log('   components :', JSON.stringify(cfg.components));
  console.log('   orval.sdkLib:', cfg.orval.sdkLib);
"

# ── 2. Link figma-tamagui-sync CLI ───────────────────────────────────────────
SYNC_TOOL="$PLUGIN_ROOT/tools/figma-tamagui-sync"

echo "→ Installing figma-tamagui-sync CLI..."
chmod +x "$SYNC_TOOL/bin/figma-tamagui-sync.js"
ln -sf "$SYNC_TOOL/bin/figma-tamagui-sync.js" /usr/local/bin/figma-tamagui-sync
echo "   Installed: $(which figma-tamagui-sync 2>/dev/null || echo 'not on PATH yet — restart shell')"

cd "$APP_ROOT"

# ── 3. package.json scripts ──────────────────────────────────────────────────
echo "→ Patching package.json scripts..."

node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  let changed = false;

  if (!pkg.scripts['sync-env-vars']) {
    pkg.scripts['sync-env-vars'] =
      'doppler secrets substitute env.template.yaml --output .env';
    console.log('   Added: sync-env-vars');
    changed = true;
  } else {
    console.log('   Already present: sync-env-vars');
  }

  if (!pkg.scripts['sync-design-tokens']) {
    pkg.scripts['sync-design-tokens'] =
      'FIGMA_TOKEN=\$FIGMA_API_KEY figma-tamagui-sync --fileId=\$FIGMA_FILE_ID --out=./src/theme';
    console.log('   Added: sync-design-tokens');
    changed = true;
  } else {
    console.log('   Already present: sync-design-tokens');
  }

  const preStart = pkg.scripts['pre-start'] || '';
  const preamble = 'yarn sync-env-vars; yarn sync-design-tokens; ';
  if (preStart && !preStart.includes('sync-env-vars')) {
    pkg.scripts['pre-start'] = preamble + preStart;
    console.log('   Patched: pre-start runs sync-env-vars + sync-design-tokens first');
    changed = true;
  } else if (!preStart) {
    pkg.scripts['pre-start'] = 'yarn sync-env-vars; yarn sync-design-tokens';
    console.log('   Created: pre-start runs sync-env-vars + sync-design-tokens');
    changed = true;
  } else {
    console.log('   Already patched: pre-start');
  }

  if (changed) fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# ── 4. env.template.yaml ─────────────────────────────────────────────────────
if [ -f "$ENV_TEMPLATE" ]; then
  if ! grep -q "FIGMA_FILE_ID" "$ENV_TEMPLATE"; then
    echo "→ Adding FIGMA_FILE_ID to env.template.yaml..."
    echo "FIGMA_FILE_ID={{ .FIGMA_FILE_ID }}" >> "$ENV_TEMPLATE"
  else
    echo "→ FIGMA_FILE_ID already in env.template.yaml"
  fi
else
  echo "→ Scaffolding env.template.yaml..."
  cat > "$ENV_TEMPLATE" <<'YAML'
FIGMA_API_KEY={{ .FIGMA_API_KEY }}
FIGMA_FILE_ID={{ .FIGMA_FILE_ID }}
SUPABASE_URL={{ .SUPABASE_URL }}
SUPABASE_SERVICE_ROLE_KEY={{ .SUPABASE_SERVICE_ROLE_KEY }}

# Optional: Sentry — uncomment and add secrets in Doppler
# EXPO_PUBLIC_SENTRY_DSN={{ .SENTRY_DSN }}
# EXPO_PUBLIC_ENV={{ .EXPO_PUBLIC_ENV }}
# SENTRY_AUTH_TOKEN={{ .SENTRY_AUTH_TOKEN }}
# SENTRY_ORG={{ .SENTRY_ORG }}
# SENTRY_PROJECT={{ .SENTRY_PROJECT }}

# Optional: Stripe — uncomment and add secrets in Doppler
# EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY={{ .STRIPE_PUBLISHABLE_KEY }}

# Optional: Firebase notifications — uncomment and add secrets in Doppler
# FIREBASE_SERVER_KEY={{ .FIREBASE_SERVER_KEY }}
YAML
  echo "   Created: env.template.yaml"
fi

# ── 5. .gitignore ─────────────────────────────────────────────────────────────
GITIGNORE="$APP_ROOT/.gitignore"
if [ -f "$GITIGNORE" ]; then
  if ! grep -qx "\.env" "$GITIGNORE"; then
    echo ".env" >> "$GITIGNORE"
    echo "→ Added .env to .gitignore"
  else
    echo "→ .env already in .gitignore"
  fi
else
  echo ".env" > "$GITIGNORE"
  echo "→ Created .gitignore with .env"
fi

# ── 6. LSP ───────────────────────────────────────────────────────────────────
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
fi

if ! node -e "process.exit(require('./package.json').devDependencies?.['typescript-language-server'] ? 0 : 1)" 2>/dev/null; then
  echo "→ Installing typescript-language-server and typescript..."
  yarn add -D typescript-language-server typescript --silent
  echo "   Done"
else
  echo "→ typescript-language-server already installed"
fi

# ── 7. Doppler project link ───────────────────────────────────────────────────
echo ""
if [ -f "$APP_ROOT/.doppler.yaml" ]; then
  echo "→ Doppler already configured (.doppler.yaml exists)"
else
  echo "→ Doppler setup (links this directory to a Doppler project)"
  echo "   Required secrets: FIGMA_API_KEY, FIGMA_FILE_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  echo "   Press Enter to run 'doppler setup', or Ctrl-C to skip and do it later."
  read -r
  doppler setup
fi

# ── 7b. Write Doppler project/config back to mcp.config.json ─────────────────
if [ -f "$APP_ROOT/.doppler.yaml" ]; then
  _dp=$(grep "project:" "$APP_ROOT/.doppler.yaml" | head -1 | sed 's/.*project:[[:space:]]*//' | tr -d '[:space:]')
  _dc=$(grep "config:" "$APP_ROOT/.doppler.yaml" | head -1 | sed 's/.*config:[[:space:]]*//' | tr -d '[:space:]')
  if [ -n "$_dp" ]; then
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('$APP_ROOT/mcp.config.json', 'utf8'));
      cfg.doppler = { project: '${_dp}', config: '${_dc:-dev}' };
      fs.writeFileSync('$APP_ROOT/mcp.config.json', JSON.stringify(cfg, null, 2) + '\n');
    "
    echo "→ Wrote doppler.project=${_dp}, doppler.config=${_dc:-dev} to mcp.config.json"
  fi
  unset _dp _dc
fi

# ── 8. Patch CLAUDE.md with values from Doppler ──────────────────────────────
# Gather all values first, then do one replacement so placeholder variants
# can't cause mismatches (e.g. if Figma is absent the original placeholder
# still contains ", Figma file ID" — chained seds would silently no-op).

FIGMA_FILE_ID_VAL=$(doppler secrets get FIGMA_FILE_ID --plain 2>/dev/null || true)

SUPABASE_REF=""
SUPABASE_URL_VAL=$(doppler secrets get SUPABASE_URL --plain 2>/dev/null || true)
if [ -n "$SUPABASE_URL_VAL" ]; then
  SUPABASE_REF=$(echo "$SUPABASE_URL_VAL" | sed 's|https://||;s|\.supabase\.co.*||')
fi

SENTRY_PROJECT_VAL=""
if [ -f "$APP_ROOT/sentry.properties" ]; then
  SENTRY_PROJECT_VAL=$(grep "^defaults.project=" "$APP_ROOT/sentry.properties" | cut -d= -f2 || true)
fi
if [ -z "$SENTRY_PROJECT_VAL" ]; then
  SENTRY_PROJECT_VAL=$(doppler secrets get SENTRY_PROJECT --plain 2>/dev/null || true)
fi
if [ -z "$SENTRY_PROJECT_VAL" ] && [ -t 0 ]; then
  read -rp "   Sentry project slug (press Enter to skip): " _sentry_input
  [ -n "$_sentry_input" ] && SENTRY_PROJECT_VAL="$_sentry_input"
  unset _sentry_input
fi

# Build replacement: bullet lines for found values + one remaining placeholder
FILLED_LINES=""
REMAINING_FIELDS="API base URL"
[ -n "$FIGMA_FILE_ID_VAL" ] && FILLED_LINES="${FILLED_LINES}- Figma file ID: ${FIGMA_FILE_ID_VAL}\n"
[ -n "$SUPABASE_REF" ]       && FILLED_LINES="${FILLED_LINES}- Supabase project ref: ${SUPABASE_REF}\n"
[ -n "$SENTRY_PROJECT_VAL" ] && FILLED_LINES="${FILLED_LINES}- Sentry project: ${SENTRY_PROJECT_VAL}\n"
[ -z "$FIGMA_FILE_ID_VAL" ] && REMAINING_FIELDS="${REMAINING_FIELDS}, Figma file ID"
[ -z "$SUPABASE_REF" ]       && REMAINING_FIELDS="${REMAINING_FIELDS}, Supabase project ref"
[ -z "$SENTRY_PROJECT_VAL" ] && REMAINING_FIELDS="${REMAINING_FIELDS}, Sentry project"

REPLACEMENT="${FILLED_LINES}<!-- Fill in: ${REMAINING_FIELDS} -->"
sed -i '' \
  "s|<!-- Fill in: API base URL, Supabase project ref, Sentry project, Figma file ID -->|${REPLACEMENT}|" \
  "$APP_ROOT/CLAUDE.md"

[ -n "$FIGMA_FILE_ID_VAL" ] && echo "→ Patched CLAUDE.md with Figma file ID"
[ -n "$SUPABASE_REF" ]       && echo "→ Patched CLAUDE.md with Supabase project ref"
[ -n "$SENTRY_PROJECT_VAL" ] && echo "→ Patched CLAUDE.md with Sentry project"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Done. Next steps:"
if [ "$REMAINING_FIELDS" = "API base URL" ]; then
  echo "  1. Edit CLAUDE.md — fill in: API base URL (only remaining field)"
else
  echo "  1. Edit CLAUDE.md — fill in: ${REMAINING_FIELDS}"
  echo "     (run 'doppler setup' then re-run this script to auto-fill more)"
fi
echo "  2. Review mcp.config.json — paths were auto-detected, adjust if needed"
echo "  3. Start Claude: claude"
echo ""
echo "   Env vars sync automatically on every 'yarn start' via pre-start."

#!/usr/bin/env bash
# One-time setup for a new Expo app using this plugin.
# Run from the app root: bash <plugin-root>/scripts/setup-app.sh
set -euo pipefail

# GNU sed (Linux) uses `sed -i`; BSD sed (macOS) requires `sed -i ''`
sed_inplace() { if [[ "$(uname)" == "Darwin" ]]; then sed -i '' "$@"; else sed -i "$@"; fi }

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
  sed_inplace "s/^# Project Name$/# ${APP_NAME}/" "$APP_ROOT/CLAUDE.md"
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
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"
ln -sf "$SYNC_TOOL/bin/figma-tamagui-sync.js" "$LOCAL_BIN/figma-tamagui-sync"
# Add ~/.local/bin to PATH in shell rc files if not already present
for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
  if [ -f "$RC" ] && ! grep -q '\.local/bin' "$RC"; then
    # shellcheck disable=SC2016
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC"
  fi
done
echo "   Installed: $(which figma-tamagui-sync 2>/dev/null || echo "$LOCAL_BIN/figma-tamagui-sync (restart shell to pick up)")"

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
      'doppler run -- bash -c \"FIGMA_TOKEN=\$FIGMA_API_KEY figma-tamagui-sync --fileId=\$FIGMA_FILE_ID --out=./src/theme\"';
    console.log('   Added: sync-design-tokens');
    changed = true;
  } else {
    console.log('   Already present: sync-design-tokens');
  }

  const preStart = pkg.scripts['prestart'] || '';
  const preamble = 'yarn sync-env-vars; yarn sync-design-tokens; ';
  if (preStart && !preStart.includes('sync-env-vars')) {
    pkg.scripts['prestart'] = preamble + preStart;
    console.log('   Patched: prestart runs sync-env-vars + sync-design-tokens first');
    changed = true;
  } else if (!preStart) {
    pkg.scripts['prestart'] = 'yarn sync-env-vars; yarn sync-design-tokens';
    console.log('   Created: prestart runs sync-env-vars + sync-design-tokens');
    changed = true;
  } else {
    console.log('   Already patched: prestart');
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
# EXPO_PUBLIC_ prefix makes these available to client-side JS (anon key only — never expose service role)
EXPO_PUBLIC_SUPABASE_URL={{ .SUPABASE_URL }}
EXPO_PUBLIC_SUPABASE_ANON_KEY={{ .SUPABASE_ANON_KEY }}
# Supabase personal access token (account-level, from supabase.com/dashboard/account/tokens)
# Used by the Supabase MCP server to manage projects. Different from the service role key.
SUPABASE_ACCESS_TOKEN={{ .SUPABASE_ACCESS_TOKEN }}

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
# Convention: workspace = app name, project = platform (mobile / web)
echo ""
_doppler_already_set=$(doppler configure get enclave.project --scope "$APP_ROOT" --plain 2>/dev/null || true)
if [ "$_doppler_already_set" = "mobile" ]; then
  echo "→ Doppler already configured (project=mobile)"
else
  echo "→ Creating Doppler project 'mobile'..."
  echo "   Convention: workspace = app name ($(doppler me --json 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{console.log(JSON.parse(d).workplace.name)}catch{console.log('?')}")), project = platform"
  echo "   Required secrets: FIGMA_API_KEY, FIGMA_FILE_ID, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN"

  # Create the project (no-op if it already exists)
  doppler projects create mobile 2>/dev/null || true

  # Scope this directory to mobile/dev
  doppler configure set enclave.project mobile --scope "$APP_ROOT"
  doppler configure set enclave.config dev --scope "$APP_ROOT"
  echo "   Linked: $APP_ROOT → mobile/dev"
fi
unset _doppler_already_set

# ── 7b. Write Doppler project/config back to mcp.config.json ─────────────────
_dp=$(doppler configure get enclave.project --scope "$APP_ROOT" --plain 2>/dev/null || true)
_dc=$(doppler configure get enclave.config  --scope "$APP_ROOT" --plain 2>/dev/null || true)
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

# ── 8. Optional service wizard ────────────────────────────────────────────────
# Ask which optional services the user wants to configure now. For each yes:
# prompt for credentials and store them in Doppler. All MCP servers are always
# present in .mcp.json — unconfigured ones show red so the user knows what's
# pending. Re-run this script any time to fill in more services.

_ask() {
  local label="$1" hint="${2:-}"
  local yn
  [ -n "$hint" ] && printf "   %s (%s)? [y/N] " "$label" "$hint" || printf "   %s? [y/N] " "$label"
  read -r yn
  [[ "$yn" =~ ^[Yy]$ ]]
}

_doppler_set() {
  doppler secrets set "$1=$2" --silent 2>/dev/null || true
}

if [ -t 0 ]; then
  echo ""
  echo "→ Optional services — add credentials now or skip (red MCP = not yet configured)"

  # ── Doppler MCP (first — needs a workspace access token, separate from CLI auth) ──
  _doppler_token=$(doppler secrets get DOPPLER_TOKEN --plain 2>/dev/null || true)
  if [ -z "$_doppler_token" ] && _ask "Doppler MCP" "manage secrets and projects via Claude"; then
    echo "   Generate a workspace access token: doppler.com/workplace/access → Service Tokens"
    read -rp "   Doppler workspace access token: " _doppler_token
    [ -n "$_doppler_token" ] && _doppler_set DOPPLER_TOKEN "$_doppler_token" && echo "   ✓ saved"
  fi
  unset _doppler_token

  # ── Supabase management MCP ─────────────────────────────────────────────────
  _supa_token=$(doppler secrets get SUPABASE_ACCESS_TOKEN --plain 2>/dev/null || true)
  if [ -z "$_supa_token" ] && _ask "Supabase management MCP" "create projects, run migrations via Claude"; then
    read -rp "   Personal access token (supabase.com/dashboard/account/tokens): " _supa_token
    [ -n "$_supa_token" ] && _doppler_set SUPABASE_ACCESS_TOKEN "$_supa_token" && echo "   ✓ saved"
  fi
  unset _supa_token

  # ── Figma ────────────────────────────────────────────────────────────────────
  _figma_key=$(doppler secrets get FIGMA_API_KEY --plain 2>/dev/null || true)
  if [ -z "$_figma_key" ] && _ask "Figma MCP" "sync design tokens, inspect components"; then
    read -rp "   Figma API key (figma.com/settings > Personal access tokens): " _figma_key
    read -rp "   Figma file ID (from your Figma file URL): " _figma_file
    [ -n "$_figma_key" ]  && _doppler_set FIGMA_API_KEY "$_figma_key"
    [ -n "$_figma_file" ] && _doppler_set FIGMA_FILE_ID "$_figma_file"
    [ -n "$_figma_key" ]  && echo "   ✓ saved"
  fi
  unset _figma_key _figma_file

  # ── Sentry ───────────────────────────────────────────────────────────────────
  _sentry_org=$(doppler secrets get SENTRY_ORG --plain 2>/dev/null || true)
  _sentry_proj="${_sentry_proj:-$(doppler secrets get SENTRY_PROJECT --plain 2>/dev/null || true)}"
  if [ -f "$APP_ROOT/sentry.properties" ]; then
    _sentry_proj=$(grep "^defaults.project=" "$APP_ROOT/sentry.properties" | cut -d= -f2 || true)
  fi
  if [ -z "$_sentry_org" ] && _ask "Sentry MCP" "query errors and performance data via Claude"; then
    read -rp "   Sentry org slug: " _sentry_org
    read -rp "   Sentry project slug: " _sentry_proj
    read -rp "   Sentry auth token (sentry.io/settings/account/api/auth-tokens): " _sentry_token
    read -rp "   Sentry DSN (from project settings): " _sentry_dsn
    [ -n "$_sentry_org" ]   && _doppler_set SENTRY_ORG "$_sentry_org"
    [ -n "$_sentry_proj" ]  && _doppler_set SENTRY_PROJECT "$_sentry_proj"
    [ -n "$_sentry_token" ] && _doppler_set SENTRY_AUTH_TOKEN "$_sentry_token"
    [ -n "$_sentry_dsn" ]   && _doppler_set SENTRY_DSN "$_sentry_dsn"
    [ -n "$_sentry_org" ]   && echo "   ✓ saved"
  fi
  unset _sentry_org _sentry_proj _sentry_token _sentry_dsn

  # ── Stripe ───────────────────────────────────────────────────────────────────
  _stripe_key=$(doppler secrets get STRIPE_SECRET_KEY --plain 2>/dev/null || true)
  if [ -z "$_stripe_key" ] && _ask "Stripe MCP" "manage products, prices, customers via Claude"; then
    read -rp "   Stripe secret key (dashboard.stripe.com/apikeys): " _stripe_key
    read -rp "   Stripe publishable key: " _stripe_pub
    [ -n "$_stripe_key" ] && _doppler_set STRIPE_SECRET_KEY "$_stripe_key"
    [ -n "$_stripe_pub" ] && _doppler_set STRIPE_PUBLISHABLE_KEY "$_stripe_pub"
    [ -n "$_stripe_key" ] && echo "   ✓ saved"
  fi
  unset _stripe_key _stripe_pub

  # ── Firebase ─────────────────────────────────────────────────────────────────
  if _ask "Firebase MCP" "manage Firestore, Auth, Storage via Claude"; then
    echo "   ✓ Firebase MCP uses CLI auth — run 'firebase login' if not already authenticated"
  fi
fi

# ── 9. Patch CLAUDE.md with values from Doppler ──────────────────────────────
# Gather all values first, then do one replacement so placeholder variants
# can't cause mismatches (e.g. if Figma is absent the original placeholder
# still contains ", Figma file ID" — chained seds would silently no-op).

FIGMA_FILE_ID_VAL=$(doppler secrets get FIGMA_FILE_ID --plain 2>/dev/null || true)

SUPABASE_REF=""
SUPABASE_URL_VAL=$(doppler secrets get SUPABASE_URL --plain 2>/dev/null || true)
if [ -n "$SUPABASE_URL_VAL" ]; then
  SUPABASE_REF=$(echo "$SUPABASE_URL_VAL" | sed 's|https://||;s|\.supabase\.co.*||')
fi

SENTRY_PROJECT_VAL=$(doppler secrets get SENTRY_PROJECT --plain 2>/dev/null || true)
if [ -z "$SENTRY_PROJECT_VAL" ] && [ -f "$APP_ROOT/sentry.properties" ]; then
  SENTRY_PROJECT_VAL=$(grep "^defaults.project=" "$APP_ROOT/sentry.properties" | cut -d= -f2 || true)
fi

# Build replacement: bullet lines for found values + one remaining placeholder
REMAINING_FIELDS="API base URL"
[ -z "$FIGMA_FILE_ID_VAL" ] && REMAINING_FIELDS="${REMAINING_FIELDS}, Figma file ID"
[ -z "$SUPABASE_REF" ]       && REMAINING_FIELDS="${REMAINING_FIELDS}, Supabase project ref"
[ -z "$SENTRY_PROJECT_VAL" ] && REMAINING_FIELDS="${REMAINING_FIELDS}, Sentry project"

FIGMA_FILE_ID_VAL="$FIGMA_FILE_ID_VAL" \
SUPABASE_REF="$SUPABASE_REF" \
SENTRY_PROJECT_VAL="$SENTRY_PROJECT_VAL" \
REMAINING_FIELDS="$REMAINING_FIELDS" \
node -e "
  const fs = require('fs');
  const { FIGMA_FILE_ID_VAL, SUPABASE_REF, SENTRY_PROJECT_VAL, REMAINING_FIELDS } = process.env;
  const lines = [];
  if (FIGMA_FILE_ID_VAL)   lines.push('- Figma file ID: ' + FIGMA_FILE_ID_VAL);
  if (SUPABASE_REF)        lines.push('- Supabase project ref: ' + SUPABASE_REF);
  if (SENTRY_PROJECT_VAL)  lines.push('- Sentry project: ' + SENTRY_PROJECT_VAL);
  lines.push('<!-- Fill in: ' + REMAINING_FIELDS + ' -->');
  const content = fs.readFileSync('$APP_ROOT/CLAUDE.md', 'utf8');
  const updated = content.replace(
    '<!-- Fill in: API base URL, Supabase project ref, Sentry project, Figma file ID -->',
    lines.join('\n')
  );
  fs.writeFileSync('$APP_ROOT/CLAUDE.md', updated);
"

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
fi
echo "  2. Review mcp.config.json — paths were auto-detected, adjust if needed"
echo "  3. Start Claude: claude"
echo ""
echo "   Env vars sync automatically on every 'yarn start' via pre-start."

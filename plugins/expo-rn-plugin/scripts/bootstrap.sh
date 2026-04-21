#!/usr/bin/env bash
set -euo pipefail

MCPS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(pwd)"

usage() {
  echo "Usage: bootstrap.sh --doppler-project <name> [--env dev|stg|prod] [--skip-rtk] [--skip-plugins]"
  echo ""
  echo "  --doppler-project   Doppler project name for this repo (required)"
  echo "  --env               Default Doppler config to use (default: stg)"
  echo "  --skip-rtk          Skip RTK installation"
  echo "  --skip-plugins      Skip Claude Code plugin installation"
  echo ""
  echo "Run from the root of the project you want to onboard."
  exit 1
}

DOPPLER_PROJECT=""
CLAUDE_ENV="stg"
SKIP_RTK=false
SKIP_PLUGINS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --doppler-project) DOPPLER_PROJECT="$2"; shift 2 ;;
    --env) CLAUDE_ENV="$2"; shift 2 ;;
    --skip-rtk) SKIP_RTK=true; shift ;;
    --skip-plugins) SKIP_PLUGINS=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

[ -z "$DOPPLER_PROJECT" ] && usage

echo "Bootstrapping Claude setup for: $PROJECT_DIR"
echo "  Doppler project : $DOPPLER_PROJECT"
echo "  Default env     : $CLAUDE_ENV"
echo "  mcps dir        : $MCPS_DIR"
echo ""

# 1. Write .mcp-project and .mcp-env
echo "$DOPPLER_PROJECT" > "$PROJECT_DIR/.mcp-project"
echo "$CLAUDE_ENV" > "$PROJECT_DIR/.mcp-env"
echo "✓ Written .mcp-project and .mcp-env"

# 2. Copy mcp-run.sh into project scripts/
mkdir -p "$PROJECT_DIR/scripts"
cp "$MCPS_DIR/scripts/mcp-run.sh" "$PROJECT_DIR/scripts/mcp-run.sh"
chmod +x "$PROJECT_DIR/scripts/mcp-run.sh"
echo "✓ scripts/mcp-run.sh"

# 3. Generate .mcp.json from template (substitute node path + mcps dir)
NODE_PATH="$(which node)"
sed \
  -e "s|__NODE_PATH__|$NODE_PATH|g" \
  -e "s|__MCPS_DIR__|$MCPS_DIR|g" \
  "$MCPS_DIR/templates/.mcp.json" > "$PROJECT_DIR/.mcp.json"
echo "✓ .mcp.json (node: $NODE_PATH)"

# 4. CLAUDE.md — create from template only if absent
if [ ! -f "$PROJECT_DIR/CLAUDE.md" ]; then
  cp "$MCPS_DIR/templates/CLAUDE.md" "$PROJECT_DIR/CLAUDE.md"
  echo "✓ CLAUDE.md (created from template — customize for your project)"
else
  echo "  CLAUDE.md already exists, skipping"
fi

# 5. .claude/ — settings.json, commands, hooks
mkdir -p "$PROJECT_DIR/.claude/commands"
mkdir -p "$PROJECT_DIR/.claude/hooks"

if [ ! -f "$PROJECT_DIR/.claude/settings.json" ]; then
  cp "$MCPS_DIR/templates/.claude/settings.json" "$PROJECT_DIR/.claude/settings.json"
  echo "✓ .claude/settings.json"
else
  echo "  .claude/settings.json already exists, skipping"
fi

# Copy commands (skip any that already exist so project customisations are preserved)
for cmd in "$MCPS_DIR/templates/.claude/commands"/*.md; do
  fname="$(basename "$cmd")"
  if [ ! -f "$PROJECT_DIR/.claude/commands/$fname" ]; then
    cp "$cmd" "$PROJECT_DIR/.claude/commands/$fname"
    echo "✓ .claude/commands/$fname"
  else
    echo "  .claude/commands/$fname already exists, skipping"
  fi
done

# Copy hooks (always overwrite — hooks are maintained in mcps, not per-project)
for hook in "$MCPS_DIR/hooks"/*.sh; do
  fname="$(basename "$hook")"
  cp "$hook" "$PROJECT_DIR/.claude/hooks/$fname"
  chmod +x "$PROJECT_DIR/.claude/hooks/$fname"
  echo "✓ .claude/hooks/$fname"
done

# 6. RTK
if [ "$SKIP_RTK" = false ]; then
  echo ""
  "$MCPS_DIR/scripts/setup-rtk.sh"
fi

# 7. Claude Code plugins
if [ "$SKIP_PLUGINS" = false ]; then
  echo ""
  "$MCPS_DIR/scripts/setup-claude.sh"
fi

echo ""
echo "Bootstrap complete."
echo ""
echo "Next steps:"
echo "  1. Add .mcp-project and .mcp-env to .gitignore (they are machine-local)"
echo "  2. Customize CLAUDE.md for your project"
echo "  3. Restart Claude Code to load the new MCP servers"

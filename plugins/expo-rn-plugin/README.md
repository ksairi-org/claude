# expo-rn-plugin

Claude Code plugin for React Native / Expo + Supabase projects. Provides MCP servers, scaffolding skills, Figma sync, i18n review, token optimization, and TypeScript code intelligence — all in one installable plugin.

## Install

```bash
claude plugin install expo-rn-plugin@your-marketplace --scope project
```

MCP servers ship with pre-built `dist/` — no build step required after install.

## Plugin components

### Skills (invoke with `/expo-rn-plugin:<name>`)

| Skill | Description |
| --- | --- |
| `scaffold <table>` | Generate full CRUD (types, hooks, screens, routes, form) from a Supabase table |
| `figma <url_or_node_id>` | Compare screen implementation against Figma design and fix discrepancies |
| `coding-standards` | Load project coding standards on demand (TypeScript, Tamagui, Zustand, Lingui) |

### Agents (available in `/agents`)

| Agent | Model | Description |
| --- | --- | --- |
| `expo-scaffolder` | Haiku | Scaffolding specialist — delegates heavy CRUD generation out of main context |
| `supabase-specialist` | Sonnet | DB queries, migrations, RLS policies |
| `i18n-reviewer` | Haiku | Audit Lingui catalogs for missing translations and hardcoded strings |

### MCP Servers

| Server | Description |
| --- | --- |
| `expo` | React Native / Expo tools: config, routes, components, scaffolding, i18n, EAS, push notifications |
| `supabase` | DB introspection, query generation, migration generation, RLS inspection |
| `figma` | Figma design data and asset export |
| `github` | GitHub PR/issue management |
| `sentry` | Error monitoring |
| `stripe` | Stripe API access |
| `doppler` | Secret management |
| `firebase` | Firebase services |
| `context7` | Up-to-date library docs (React Native, Expo, Supabase, etc.) |

All servers that require secrets are wrapped via Doppler (`bin/mcp-run.sh`).

### Hooks (automatic)

| Event | Hook | Effect |
| --- | --- | --- |
| `SessionStart` | `build-mcp-servers.sh` | Builds MCP servers if outdated (first run or plugin update) |
| `PreToolUse` (Bash) | `rtk-rewrite.sh` | RTK token optimizer — 60–90% token savings on shell commands (no-op if RTK not installed) |
| `PostToolUse` (Write/Edit) | `tsc-check.sh` | Runs `tsc --noEmit` after file edits in TypeScript projects |
| `Stop` | `context-warning.sh` | Warns when context window ≥ 70% — prompts for `/compact` |

### Monitors (background)

| Monitor | Trigger | Description |
| --- | --- | --- |
| `pending-migrations` | Always | Detects unapplied Supabase migrations on session start and every 5 min |
| `eas-active-builds` | On `scaffold` skill invoke | Polls EAS for in-progress / failed builds |

### LSP

TypeScript Language Server (`typescript-language-server`) — provides go-to-definition, find references, and live diagnostics for `.ts`, `.tsx`, `.js`, `.jsx` files.

Requires: `npm install -g typescript-language-server typescript`

## Configuration

When enabling the plugin, you'll be prompted for:

| Key | Description |
| --- | --- |
| `doppler_project` | Your Doppler project name (e.g. `my-app`) |
| `doppler_config` | Config to use (`dev` / `stg` / `prod`, default: `dev`) |

## Project CLAUDE.md

Keep your project's `CLAUDE.md` lean (under 50 lines). Move detailed standards to the on-demand skill:

```markdown
# Project

React Native / Expo + Supabase app. For coding standards, run `/expo-rn-plugin:coding-standards`.

## Project Context
- Expo Router for navigation
- Tamagui for styling (`src/theme/`)
- Lingui for i18n
- Supabase `api` schema (not public)
```

This keeps session startup context small and only loads standards when needed.

## Cost tips

- `coding-standards` skill loads on demand — not burned on every session
- `expo-scaffolder` and `i18n-reviewer` use Haiku — cheap for high-volume generation/audit tasks
- RTK hook saves 60–90% on shell command tokens automatically
- `context-warning` hook reminds you to `/compact` at 70% context — prevents wasteful re-reads

## Development

### First-time setup (contributors)

Install the git pre-push hook from the repo root — it rebuilds `dist/` automatically before every push:

```bash
bash scripts/install-hooks.sh
```

### Build MCP servers manually

```bash
cd mcps/expo-mcp-server && yarn build
cd mcps/supabase-mcp-server && yarn build
```

`dist/` is committed to git. CI will fail if you push source changes without rebuilding. The pre-push hook handles this for you automatically.

### Testing the plugin locally

```bash
claude --plugin-dir .
```

### Validate the manifest

```bash
claude plugin validate
```

## Adding a new MCP server

1. Create a directory under `mcps/` (e.g. `mcps/my-mcp-server/`)
2. Follow the structure of `mcps/expo-mcp-server/` (`src/index.ts`, `src/tools/`, `package.json`, `tsconfig.json`)
3. Add an entry to `.mcp.json` using `${CLAUDE_PLUGIN_ROOT}/bin/mcp-run.sh` as the command
4. The `scripts/build-mcp-servers.sh` hook will build it automatically on next session start

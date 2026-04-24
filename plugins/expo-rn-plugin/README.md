# expo-rn-plugin

Claude Code plugin for React Native / Expo projects. Provides MCP servers, scaffolding skills, Figma sync, i18n review, and TypeScript code intelligence — all in one installable plugin. Supports Supabase, Firebase, and REST backends.

## Requirements

macOS or Linux. Windows users must run inside [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) — the plugin scripts require bash and Homebrew (via Linuxbrew in WSL2).

## New app quickstart

```bash
# 1. Create your Expo app (if starting fresh)
yarn create expo-app my-app && cd my-app

# 2. Install the plugin
claude plugin install expo-rn-plugin --scope project
# → You'll be prompted for your Doppler project name and config (dev/stg/prod)

# 3. Run one-time setup from your app root
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-app.sh"
# → Copies templates (.mcp.json, CLAUDE.md, mcp.config.json, .claude/)
# → Links figma-tamagui-sync CLI
# → Adds sync-design-tokens script to package.json
# → Creates .lsp.json for TypeScript LSP

# 4. Finish manually
#    a) Edit CLAUDE.md — fill in project name and context placeholders
#    b) Edit mcp.config.json — adjust component paths for your structure
#    c) Set secrets in Doppler, then sync:
yarn sync-env-vars dev
#    d) Add LSP devDep:
yarn add -D typescript-language-server

# 5. Start Claude
claude
```

## Install (existing project)

```bash
claude plugin install expo-rn-plugin --scope project
```

> Registry URL will be updated once published.

MCP servers ship with pre-built `dist/` — no build step required after install.

Run setup once from your app root:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-app.sh"
```

## Plugin components

### Skills (invoke with `/expo-rn-plugin:<name>`)

| Skill | Description |
| --- | --- |
| `scaffold <table>` | Generate full CRUD (types, hooks, screens, routes, form) from a database table |
| `form <feature>` | Generate a zod schema, react-hook-form hook, and Tamagui form component |
| `figma <url_or_node_id>` | Compare screen implementation against Figma design and fix discrepancies |
| `coding-standards` | Load project coding standards on demand (TypeScript, Tamagui, Zustand, Lingui) |
| `analytics` | Load analytics standards — event naming, screen tracking, user identification, privacy rules (Firebase default; PostHog, Amplitude alternatives) |
| `testing` | Write or fix component and hook tests using jest-expo and @testing-library/react-native |
| `ksairi-libs` | *(optional)* Full reference for `@ksairi-org/*` libraries fetched live from GitHub. Load before writing any utility, hook, or layout code if your project uses these packages. |

### Agents (available in `/agents`)

| Agent | Model | Description |
| --- | --- | --- |
| `expo-scaffolder` | Haiku | Scaffolding specialist — delegates heavy CRUD generation out of main context |
| `database-specialist` | Sonnet | DB queries, migrations, RLS policies |
| `i18n-reviewer` | Haiku | Audit Lingui catalogs for missing translations and hardcoded strings |
| `auth-specialist` | Sonnet | Supabase auth flows, Google/Apple sign-in, token lifecycle |
| `payment-specialist` | Sonnet | Stripe PaymentSheet, PCI compliance, webhooks |

### MCP Servers

| Server | Description |
| --- | --- |
| `expo` | React Native / Expo tools: config, routes, components, scaffolding, i18n, EAS, push notifications |
| `database` | DB introspection, query generation, migration generation, RLS inspection |
| `figma` | Figma design data and asset export |
| `github` | GitHub PR/issue management |
| `sentry` | Error monitoring |
| `stripe` | Stripe API access |
| `doppler` | Secret management |
| `firebase` | Firebase services |
| `context7` | Up-to-date library docs (React Native, Expo, etc.) |

All servers that require secrets are wrapped via Doppler (`bin/mcp-run.sh`).

### Hooks (automatic)

| Event | Hook | Effect |
| --- | --- | --- |
| `SessionStart` | `build-mcp-servers.sh` | Builds MCP servers if outdated (first run or plugin update) |
| `SessionStart` | `sync-figma-tokens.sh` | Syncs Tamagui design tokens from Figma if `FIGMA_FILE_ID` + `FIGMA_API_KEY` are set (no-op otherwise) |
| `PreToolUse` (Write/Edit) | `guard-generated-files.sh` | Blocks edits to auto-generated files (`src/api/generated/`, `src/theme/`) — run the generator instead |
| `PostToolUse` (Write/Edit) | `tsc-check.sh` | Runs `tsc --noEmit` after file edits in TypeScript projects |
| `Stop` | `context-warning.sh` | Warns when context window ≥ 70% — prompts for `/compact` |

### Monitors (background)

| Monitor | Trigger | Description |
| --- | --- | --- |
| `pending-migrations` | Always | Detects unapplied database migrations on session start and every 5 min |
| `eas-active-builds` | On `scaffold` skill invoke | Polls EAS for in-progress / failed builds |

### LSP

TypeScript Language Server (`typescript-language-server`) — provides go-to-definition, find references, and live diagnostics for `.ts`, `.tsx`, `.js`, `.jsx` files.

Requires: `yarn add -D typescript-language-server typescript` in your project root.

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

React Native / Expo app. For coding standards, run `/expo-rn-plugin:coding-standards`.

## Project Context
- Expo Router for navigation
- Tamagui for styling (`src/theme/`)
- Lingui for i18n
- Database `api` schema (not public)
```

This keeps session startup context small and only loads standards when needed.

## Cost tips

- `coding-standards` skill loads on demand — not burned on every session
- `expo-scaffolder` and `i18n-reviewer` use Haiku — cheap for high-volume generation/audit tasks
- `context-warning` hook reminds you to `/compact` at 70% context — prevents wasteful re-reads

## Development

### First-time setup (contributors)

Install the git pre-push hook from the repo root — it rebuilds `dist/` automatically before every push:

```bash
bash scripts/setup-claude.sh
```

### Build MCP servers manually

```bash
cd mcps/expo-mcp-server && yarn build
cd mcps/database-mcp-server && yarn build
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

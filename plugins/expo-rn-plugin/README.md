# expo-rn-plugin

Claude Code plugin for React Native / Expo projects. Provides MCP servers, scaffolding skills, Figma sync, i18n review, and TypeScript code intelligence — all in one installable plugin. Supports Supabase, Firebase, and REST backends.

## Requirements

- macOS or Linux (Windows: [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install))
- Node.js 18+
- Yarn Berry (`corepack enable && corepack prepare yarn@stable --activate`)
- [Homebrew](https://brew.sh) — setup-app.sh installs `jq` and `doppler` via brew
- Claude Code CLI

## New app quickstart

```bash
# 1. Create your Expo app
yarn create expo-app my-app && cd my-app

# 2. Install the plugin (sets CLAUDE_PLUGIN_ROOT automatically)
claude plugin install expo-rn-plugin --scope project

# 3. Run one-time setup — interactive, takes ~2 min
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-app.sh"
# → Copies CLAUDE.md, mcp.config.json, .mcp.json, .claude/ commands
# → Auto-fills CLAUDE.md with project name from package.json
# → Detects actual dir structure and writes mcp.config.json
# → Adds sync-env-vars + sync-design-tokens to package.json; wires pre-start
# → Scaffolds env.template.yaml; ensures .env is gitignored
# → Installs typescript-language-server and typescript
# → Runs doppler setup (interactive); auto-fills Figma file ID,
#    Supabase project ref, and Sentry project into CLAUDE.md

# 4. Edit CLAUDE.md — fill in the one remaining placeholder:
#    API base URL
#    (project name, Figma file ID, Supabase ref, Sentry project are auto-filled)

# 5. Start Claude
claude
```

> `CLAUDE_PLUGIN_ROOT` is set automatically by `claude plugin install`. Run the bash
> command from within a `claude` session or via `claude run` if you need the variable
> outside of it.

## Install (existing project)

```bash
claude plugin install expo-rn-plugin --scope project
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-app.sh"
```

MCP servers ship with pre-built `dist/` — no build step required after install.

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
| `SessionStart` | `figma/sync-figma-tokens.sh` | Syncs Tamagui design tokens from Figma if `FIGMA_FILE_ID` + `FIGMA_API_KEY` are set (no-op otherwise) |
| `PreToolUse` (Write/Edit) | `guard-generated-files.sh` | Blocks edits to auto-generated files (`src/api/generated/`, `src/theme/`) — run the generator instead |
| `PostToolUse` (Write/Edit) | `tsc-check.sh` | Runs `tsc --noEmit` after file edits in TypeScript projects |
| `Stop` | `context-warning.sh` | Warns when context window ≥ 70% — prompts for `/compact` |

### LSP

TypeScript Language Server (`typescript-language-server`) — provides go-to-definition, find references, and live diagnostics for `.ts`, `.tsx`, `.js`, `.jsx` files.

`setup-app.sh` installs `typescript-language-server` and `typescript` as devDependencies automatically.

## Configuration

When enabling the plugin, you'll be prompted for:

| Key | Description |
| --- | --- |
| `doppler_project` | Your Doppler project name (e.g. `my-app`) |
| `doppler_config` | Config to use (`dev` / `stg` / `prod`, default: `dev`) |

## Project CLAUDE.md

Keep your project's `CLAUDE.md` lean (under 60 lines). Move detailed standards to the on-demand skill:

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

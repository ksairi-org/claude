# expo-rn-plugin

Claude Code plugin for React Native / Expo projects. Provides MCP servers, scaffolding skills, Figma sync, i18n review, and TypeScript code intelligence — all in one installable plugin. Supports Supabase, Firebase, and REST backends.

## Requirements

- macOS or Linux (Windows: [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install))
- Node.js 18+
- Python 3 (`python3`) — used by `mcp-run.sh` and `guard-generated-files.sh` to parse JSON
- Yarn Berry (`corepack enable && corepack prepare yarn@stable --activate`)
- [Homebrew](https://brew.sh) — setup-app.sh installs `jq` and `doppler` via brew
- Claude Code CLI

## New app quickstart

> **Before step 3:** `setup-app.sh` runs `doppler setup` interactively and uses your Doppler
> secrets to auto-fill CLAUDE.md. You need a Doppler account and a project created (with secrets
> added) before running it — see [Doppler setup](#doppler-setup) below.
>
> **`CLAUDE_PLUGIN_ROOT`** is set automatically by the marketplace installer inside `claude` sessions. When testing from source with `--plugin-dir`, it is **not** set automatically — prefix the command as shown below.

```bash
# 1. Create your Expo app
yarn create expo-app my-app && cd my-app

# 2. Install the plugin
claude plugin install expo-rn-plugin --scope project
# Testing from source? Set CLAUDE_PLUGIN_ROOT explicitly:
#   CLAUDE_PLUGIN_ROOT=/path/to/expo-rn-plugin claude --plugin-dir /path/to/expo-rn-plugin

# 3. Run one-time setup — interactive, takes ~2 min
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-app.sh"
# When testing from source (CLAUDE_PLUGIN_ROOT not set), run directly:
#   bash /path/to/expo-rn-plugin/scripts/setup-app.sh
# → Copies CLAUDE.md, mcp.config.json, .mcp.json, .claude/settings.json, .claude/commands/
# → Auto-fills CLAUDE.md with project name from package.json
# → Detects actual dir structure and writes mcp.config.json
# → Adds sync-env-vars + sync-design-tokens to package.json; wires prestart
# → Scaffolds env.template.yaml; ensures .env is gitignored
# → Installs typescript-language-server and typescript
# → Runs doppler setup (interactive); auto-fills Figma file ID,
#    Supabase project ref, and Sentry project into CLAUDE.md

# 4. Edit CLAUDE.md — in the "## Project context" section, fill in:
#    - api: https://api.your-domain.com
#    (project name, Figma file ID, Supabase ref, Sentry project are auto-filled)

# 5. Start Claude
claude
```

## Install (existing project)

```bash
claude plugin install expo-rn-plugin --scope project
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-app.sh"
```

MCP servers ship with pre-built `dist/` — no build step required after install.

## Plugin components

### Skills (invoke with `/expo-rn-plugin:<name>`)

Skills with a matching project command (e.g. `/form`) can also be invoked via the short form — the command is a thin stub that delegates to the skill. Skills without a project command **must** use the full `/expo-rn-plugin:<name>` prefix.

| Skill                    | Project command | Description                                                                                                                                                                    |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scaffold <table>`       | `/scaffold`     | Generate full CRUD (types, hooks, screens, routes, form) from a database table                                                                                                 |
| `form <feature>`         | `/form`         | Generate a zod schema, react-hook-form hook, and Tamagui form component                                                                                                        |
| `figma <url_or_node_id>` | `/figma`        | Compare screen implementation against Figma design and fix discrepancies                                                                                                       |
| `sentry`                 | `/sentry`       | Sentry error monitoring — setup, capture patterns, and MCP usage                                                                                                               |
| `stripe`                 | `/stripe`       | Stripe payments — PaymentSheet flow, PCI rules, and MCP usage                                                                                                                  |
| `preview`                | `/preview`      | Screenshot the running simulator, check device errors, and run tsc — use after every UI change                                                                                 |
| `coding-standards`       | —               | Load project coding standards on demand (TypeScript, Tamagui, Zustand, Lingui)                                                                                                 |
| `analytics`              | —               | Load analytics standards — event naming, screen tracking, user identification, privacy rules (Firebase default; PostHog, Amplitude alternatives)                               |
| `testing`                | —               | Write or fix component and hook tests using jest-expo and @testing-library/react-native                                                                                        |
| `libs`                   | —               | _(optional)_ Full reference for `@ksairi-org/*` libraries fetched live from GitHub. Load before writing any utility, hook, or layout code if your project uses these packages. |

### Project commands (standalone, no skill file)

These commands are copied to `.claude/commands/` by `setup-app.sh` and are available as `/command-name` after setup. They are self-contained guides — no skill prefix needed.

| Command                             | Description                                                 |
| ----------------------------------- | ----------------------------------------------------------- |
| `/auth <google\|apple\|email\|all>` | Wire up Supabase auth (Google, Apple, email sign-in)        |
| `/zustand`                          | Canonical Zustand store pattern (typed, MMKV-persisted)     |
| `/doppler <VAR=value>`              | Add a new secret to Doppler and sync it to `.env`           |
| `/orval`                            | Regenerate OpenAPI hooks from the backend spec              |
| `/notifications`                    | Set up push notifications (expo-notifications + FCM)        |
| `/sync-tokens`                      | Pull latest design tokens from Figma mid-session            |
| `/preview [screen]`                 | Screenshot the running simulator and verify the UI visually |

Skill-backed stubs (thin wrappers — see Skills table above for full docs): `/form`, `/scaffold`, `/figma`, `/sentry`, `/stripe`.

### Agents (available in `/agents`)

| Agent                 | Model  | Description                                                                  |
| --------------------- | ------ | ---------------------------------------------------------------------------- |
| `expo-scaffolder`     | Haiku  | Scaffolding specialist — delegates heavy CRUD generation out of main context |
| `database-specialist` | Sonnet | DB queries, migrations, RLS policies                                         |
| `i18n-reviewer`       | Haiku  | Audit Lingui catalogs for missing translations and hardcoded strings         |
| `auth-specialist`     | Sonnet | Supabase auth flows, Google/Apple sign-in, token lifecycle                   |
| `payment-specialist`  | Sonnet | Stripe PaymentSheet, PCI compliance, webhooks                                |

### MCP Servers

| Server     | Description                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `expo`     | React Native / Expo tools: config, routes, components, scaffolding, i18n, EAS, push notifications |
| `database` | DB introspection, query generation, migration generation, RLS inspection                          |
| `figma`    | Figma design data and asset export                                                                |
| `github`   | GitHub PR/issue management                                                                        |
| `sentry`   | Error monitoring                                                                                  |
| `stripe`   | Stripe API access                                                                                 |
| `doppler`  | Secret management                                                                                 |
| `firebase` | Firebase services                                                                                 |
| `context7` | Up-to-date library docs (React Native, Expo, etc.)                                                |

All servers that require secrets are wrapped via Doppler (`bin/mcp-run.sh`).

### Hooks (automatic)

| Event                      | Hook                         | Effect                                                                                                |
| -------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SessionStart`             | `build-mcp-servers.sh`       | Builds MCP servers if outdated (first run or plugin update)                                           |
| `SessionStart`             | `figma/sync-figma-tokens.sh` | Syncs Tamagui design tokens from Figma if `FIGMA_FILE_ID` + `FIGMA_API_KEY` are set (no-op otherwise) |
| `PreToolUse` (Write/Edit)  | `guard-generated-files.sh`   | Blocks edits to auto-generated files (`src/api/generated/`, `src/theme/`) — run the generator instead |
| `PostToolUse` (Write/Edit) | `tsc-check.sh`               | Runs `tsc --noEmit` after file edits in TypeScript projects                                           |
| `Stop`                     | `context-warning.sh`         | Warns when context window ≥ 70% — prompts for `/compact`                                              |

### Monitors (automatic)

| Monitor              | When active                                               | Effect                                                                             |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pending-migrations` | Always                                                    | Emits a warning when Supabase migration files are unapplied; re-checks every 5 min |
| `eas-active-builds`  | Always (no-ops when `eas` CLI absent or no active builds) | Polls EAS for in-progress builds and prints status updates every 60 s              |

### LSP

TypeScript Language Server (`typescript-language-server`) — provides go-to-definition, find references, and live diagnostics for `.ts`, `.tsx`, `.js`, `.jsx` files.

`setup-app.sh` installs `typescript-language-server` and `typescript` as devDependencies automatically.

## Configuration

The plugin has two optional install-time config keys:

| Key               | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `doppler_project` | Your Doppler project name (e.g. `my-app`)              |
| `doppler_config`  | Config to use (`dev` / `stg` / `prod`, default: `dev`) |

You do not need to fill these in manually. `setup-app.sh` runs `doppler setup` interactively and writes both values to `mcp.config.json` automatically. The install-time prompts are a fallback only.

## mcp.config.json

`mcp.config.json` (at your app root) tells the MCP servers where to find your project's files and secrets. `setup-app.sh` auto-detects most values, but you can edit it at any time:

```json
{
  "doppler": { "project": "my-app", "config": "dev" },
  "database": { "schema": "api" },
  "routesDir": "app",
  "components": {
    "atoms": "src/components/atoms",
    "molecules": "src/components/molecules",
    "organisms": "src/components/organisms",
    "screens": "src/screens"
  },
  "orval": { "sdkLib": "src/api/generated" }
}
```

The `doppler` block is what connects MCP servers to your secrets — without it, servers that need env vars (Sentry, Stripe, etc.) will start without credentials.

## Doppler setup

Doppler stores all secrets (API keys, Supabase URLs, etc.) so nothing lives in `.env` files checked into git.

1. Create a free account at [doppler.com](https://doppler.com) if you don't have one
2. Create a project (e.g. `my-app`) with a `dev` config
3. Add these secrets to the `dev` config:
   - `FIGMA_API_KEY`, `FIGMA_FILE_ID`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
     (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are derived automatically in `env.template.yaml` — never expose the service role key client-side)
   - `SUPABASE_ACCESS_TOKEN` — personal access token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens); used by the Supabase MCP server to manage projects (different from the service role key)
   - Optional: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
   - Optional: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
4. When `setup-app.sh` runs `doppler setup`, select your project and `dev` config

After setup, `yarn start` automatically writes `.env` from Doppler secrets via the `prestart` script. Design tokens also sync on `yarn start` (via `doppler run` inside the script — no extra flags needed).

## Project CLAUDE.md

Keep your project's `CLAUDE.md` lean (under 80 lines). Move detailed standards to the on-demand skill:

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
- Install [RTK](https://github.com/rtk-ai/rtk) (`rtk init -g`) — wraps all CLI commands to strip verbose output, cutting per-command token usage by 60–90%

## Development

### First-time setup (contributors)

Install Claude Code plugins (compound-engineering, expo, github) — run from the plugin root:

```bash
bash scripts/setup-claude.sh
```

### Build MCP servers manually

```bash
cd mcps/expo-mcp-server && yarn install --immutable && yarn build
cd mcps/database-mcp-server && yarn install --immutable && yarn build
```

`dist/` is committed to git. CI will fail if you push source changes without rebuilding. The pre-push hook handles this for you automatically.

### Testing the plugin locally

```bash
CLAUDE_PLUGIN_ROOT=$(pwd) claude --plugin-dir .
```

### Validate the manifest

```bash
claude plugin validate
```

## Adding a new MCP server

1. Create a directory under `mcps/` (e.g. `mcps/my-mcp-server/`)
2. Follow the structure of `mcps/expo-mcp-server/` (`src/index.ts`, `src/tools/`, `package.json`, `tsconfig.json`)
3. Add an entry to `.mcp.json` using `${CLAUDE_PLUGIN_ROOT}/bin/mcp-run.sh` as the command
4. Add `build_server "my-mcp-server"` to `scripts/build-mcp-servers.sh` — the script hardcodes server names, it does not auto-discover new ones

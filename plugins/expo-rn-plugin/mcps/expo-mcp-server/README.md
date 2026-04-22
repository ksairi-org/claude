# expo-mcp-server

MCP server for React Native / Expo development. Provides project inspection, code scaffolding, i18n checking, and push notification testing — all driven by the project's actual code and config.

## Tools

### Project inspection

| Tool | Description |
| --- | --- |
| `get_config` | Reads `mcp.config.json` from the project root. Use this first — other tools depend on it. |
| `init_project_config` | Auto-detects project structure and creates `mcp.config.json`. Run once on new projects. |
| `get_components` | Returns all UI components (atoms → screens) with their props. Use before generating new components to avoid duplication. |
| `get_routes` | Returns the full Expo Router route tree including which components each screen uses. Use before adding a new screen. |
| `get_design_tokens` | Returns all Tamagui design tokens (colors, spacing, radius, typography). Use before writing styled components. |
| `get_orval_api_surface` | Returns all hooks and types exported by the orval-generated API SDK. Use before writing data-fetching code. |

### Scaffolding

| Tool | Description |
| --- | --- |
| `scaffold_form` | Generates a Zod schema, react-hook-form hook, and RN form component from a Supabase table. |
| `scaffold_crud` | Generates TypeScript types, react-query hooks, List/Detail/Create screens, and Expo Router routes from a Supabase table. |

> `scaffold_form` and `scaffold_crud` require Supabase env vars (they read the live schema).

### i18n

| Tool | Description |
| --- | --- |
| `i18n_check` | Checks Lingui catalogs for untranslated strings, missing keys, hardcoded text, variable mismatches, and plural form gaps. |

### Push notifications

| Tool | Description |
| --- | --- |
| `inspect_push_tokens` | Shows FCM token counts by platform from the Supabase DB. Returns migration SQL if the table doesn't exist yet. |
| `send_test_push` | Sends a test FCM notification to a specific device token via the Firebase v1 HTTP API. |

### Testing and builds

| Tool | Description |
| --- | --- |
| `run_e2e_test` | Runs a Maestro E2E flow from `.maestro/`. Omit flow name to list available flows. |
| `eas_build_status` | Returns recent EAS build status (profile, platform, status, links) via `eas build:list`. |

## Setup

### mcp.config.json

Each project that uses this server needs an `mcp.config.json` at its root. Run `init_project_config` to generate one, or call `get_config` to inspect the current one.

### Environment variables

Required for all tools that touch Supabase (`scaffold_form`, `scaffold_crud`, `inspect_push_tokens`, `send_test_push`):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Build

```bash
yarn install
yarn build
```

### .mcp.json entry

```json
"expo": {
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/expo-mcp-server/dist/index.js"]
}
```

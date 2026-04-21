import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initProjectConfig, formatInitResult } from "./tools/init-project-config.js";
import { getComponents, formatComponentLibrary } from "./tools/get-components.js";
import { getRoutes, formatRouteStructure } from "./tools/get-routes.js";
import { getConfig } from "./tools/get-config.js";
import { loadConfig } from "./tools/load-config.js";
import { runI18nCheck } from "./tools/i18n-check.js";
import { scaffoldForm, formatScaffoldResult } from "./tools/scaffold-form.js";
import { scaffoldCrud, formatScaffoldCrudResult } from "./tools/scaffold-crud.js";
import {
  inspectPushTokens,
  formatInspectResult,
  sendTestPush,
  formatSendResult,
} from "./tools/push-notifications.js";
import { runE2eTest, listFlows, formatE2eResult } from "./tools/run-e2e-test.js";
import { getEasBuildStatus, formatEasStatus } from "./tools/eas-build-status.js";
import { getDesignTokens, formatDesignTokens } from "./tools/design-tokens.js";
import { getOrvalApiSurface, formatApiSurface } from "./tools/orval-api-surface.js";

const server = new McpServer({
  name: "expo-mcp-server",
  version: "1.0.0",
});

// ─── Project inspection ───────────────────────────────────────────────────────

server.registerTool(
  "get_config",
  {
    description:
      "Shows the current mcp.config.json for the project. Use this first to understand how the MCP server is configured for this specific project.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
    },
  },
  async ({ projectRoot }) => {
    const summary = await getConfig(projectRoot);
    return { content: [{ type: "text", text: summary }] };
  },
);

server.registerTool(
  "init_project_config",
  {
    description:
      "Creates mcp.config.json in the project root by auto-detecting the project structure (router, component directories, libs, i18n, orval). Run once when setting up a new project. Skips creation if the file already exists unless overwrite is true.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
      supabaseSchema: z
        .string()
        .optional()
        .describe('Supabase schema name. Defaults to "api".'),
      sourceLocale: z
        .string()
        .optional()
        .describe('Source locale for i18n. Defaults to "en".'),
      targetLocales: z
        .array(z.string())
        .optional()
        .describe('Target locales for i18n. Defaults to ["es"].'),
      overwrite: z
        .boolean()
        .optional()
        .describe("Overwrite existing mcp.config.json. Default: false."),
    },
  },
  async ({ projectRoot, supabaseSchema, sourceLocale, targetLocales, overwrite }) => {
    const result = await initProjectConfig({ projectRoot, supabaseSchema, sourceLocale, targetLocales, overwrite });
    return { content: [{ type: "text", text: formatInitResult(result) }] };
  },
);

server.registerTool(
  "get_components",
  {
    description:
      "Returns all UI components available in the project (atoms, molecules, organisms, screens, libs) with their props. Use this before generating any screen or component to avoid duplicating existing work and to use correct component names and props.",
    inputSchema: {
      projectRoot: z
        .string()
        .describe(
          "Absolute path to the React Native project root, e.g. /Users/you/projects/my-app",
        ),
    },
  },
  async ({ projectRoot }) => {
    const { library, config } = await getComponents(projectRoot);
    return {
      content: [{ type: "text", text: formatComponentLibrary(library, config) }],
    };
  },
);

server.registerTool(
  "get_routes",
  {
    description:
      "Returns the full Expo Router route structure of the app including route groups, existing screens, and which components/hooks each screen uses. Use this before adding a new screen to know exactly where to place it.",
    inputSchema: {
      projectRoot: z
        .string()
        .describe(
          "Absolute path to the React Native project root, e.g. /Users/you/projects/my-app",
        ),
    },
  },
  async ({ projectRoot }) => {
    const structure = await getRoutes(projectRoot);
    return {
      content: [{ type: "text", text: formatRouteStructure(structure) }],
    };
  },
);

server.registerTool(
  "get_design_tokens",
  {
    description:
      "Returns all Tamagui design tokens defined in the project (colors, spacing, radius, typography). Use this before writing any styled component to pick correct $token references. Raw hex/rgba strings will error at compile time.",
    inputSchema: {
      projectRoot: z
        .string()
        .describe("Absolute path to the React Native project root"),
    },
  },
  async ({ projectRoot }) => {
    const tokens = await getDesignTokens(projectRoot);
    return {
      content: [{ type: "text", text: formatDesignTokens(tokens, projectRoot) }],
    };
  },
);

server.registerTool(
  "get_orval_api_surface",
  {
    description:
      "Returns all hooks and types exported by the orval-generated API SDK. Use this before writing any data-fetching code to reuse existing hooks instead of writing manual Supabase queries. Run `yarn orval` first if the SDK is out of date.",
    inputSchema: {
      projectRoot: z
        .string()
        .describe("Absolute path to the React Native project root"),
    },
  },
  async ({ projectRoot }) => {
    const files = await getOrvalApiSurface(projectRoot);
    return {
      content: [{ type: "text", text: formatApiSurface(files) }],
    };
  },
);

// ─── Scaffolding ──────────────────────────────────────────────────────────────

server.registerTool(
  "scaffold_form",
  {
    description:
      "Generates a Zod schema, react-hook-form hook, and React Native form component from a Supabase table. Use this when building a create/edit form for any table in the api schema.",
    inputSchema: {
      tableName: z
        .string()
        .describe(
          "Name of the table in the api schema to scaffold a form for, e.g. \"transactions\"",
        ),
      omitAutoFields: z
        .boolean()
        .optional()
        .describe(
          "Skip auto-managed columns (id, created_at, updated_at, deleted_at). Default: true",
        ),
    },
  },
  async ({ tableName, omitAutoFields }) => {
    const result = await scaffoldForm({ tableName, omitAutoFields });
    return {
      content: [{ type: "text", text: formatScaffoldResult(result) }],
    };
  },
);

server.registerTool(
  "scaffold_crud",
  {
    description:
      "Generates TypeScript types, react-query CRUD hooks, List/Detail/Create screens, and Expo Router route files from a Supabase table. Run scaffold_form first (or alongside) to get the form component the detail and create screens depend on.",
    inputSchema: {
      tableName: z
        .string()
        .describe(
          'Name of the table in the api schema to scaffold CRUD for, e.g. "wallets"',
        ),
      projectRoot: z
        .string()
        .describe(
          "Absolute path to the React Native project root, e.g. /Users/you/projects/my-app",
        ),
      omitAutoFields: z
        .boolean()
        .optional()
        .describe(
          "Skip auto-managed columns (id, created_at, updated_at, deleted_at) from write types. Default: true",
        ),
      includeForm: z
        .boolean()
        .optional()
        .describe(
          "Generate form-based detail and create screens that depend on the scaffold_form output. Default: false — detail screen is read-only, no create screen is generated.",
        ),
    },
  },
  async ({ tableName, projectRoot, omitAutoFields, includeForm }) => {
    const result = await scaffoldCrud({ tableName, projectRoot, omitAutoFields, includeForm });
    return {
      content: [{ type: "text", text: formatScaffoldCrudResult(result) }],
    };
  },
);

// ─── i18n ─────────────────────────────────────────────────────────────────────

server.registerTool(
  "i18n_check",
  {
    description:
      "Check Lingui i18n catalogs for untranslated strings, missing keys across locales, and hardcoded text in source files. Optionally runs `lingui extract --clean` first to sync catalogs with source before checking.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
      extract: z
        .boolean()
        .optional()
        .describe(
          "Run `lingui extract --clean` before checking. Updates catalogs from source first. Slower (~5–15s) but gives accurate results on unsaved work. Default: false.",
        ),
      checks: z
        .array(
          z.enum([
            "untranslated",
            "missing_keys",
            "hardcoded",
            "variable_mismatch",
            "plural_forms",
          ]),
        )
        .optional()
        .describe(
          "Which checks to run. Defaults to [untranslated, missing_keys, hardcoded]. Opt-in extras: variable_mismatch (detects {placeholder} dropped/renamed in translations), plural_forms (detects missing ICU plural categories for the target locale).",
        ),
    },
  },
  async ({ projectRoot, extract, checks }) => {
    const config = await loadConfig(projectRoot);
    const result = await runI18nCheck(projectRoot, config, { extract, checks });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ─── Push notifications ───────────────────────────────────────────────────────

server.registerTool(
  "inspect_push_tokens",
  {
    description:
      "Inspect FCM push tokens stored in your Supabase database. Returns token counts by platform and a preview of recent tokens. If the table doesn't exist yet, returns a ready-to-run migration SQL to create it.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
      tableName: z
        .string()
        .optional()
        .describe(
          'Name of the table that stores device tokens. Defaults to the value in mcp.config.json firebase.deviceTokensTable, or "device_tokens".',
        ),
      limit: z
        .number()
        .optional()
        .describe("Number of recent tokens to return. Default: 10."),
    },
  },
  async ({ projectRoot, tableName, limit }) => {
    const result = await inspectPushTokens({ projectRoot, tableName, limit });
    return { content: [{ type: "text", text: formatInspectResult(result) }] };
  },
);

server.registerTool(
  "send_test_push",
  {
    description:
      "Send a test FCM push notification to a specific device token using the Firebase v1 HTTP API. Requires a Firebase service account JSON (path set in mcp.config.json or passed directly). Use inspect_push_tokens to find tokens to test with.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
      token: z.string().describe("FCM device token to send the notification to"),
      title: z.string().describe("Notification title"),
      body: z.string().describe("Notification body text"),
      data: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Optional key-value data payload (all values must be strings)",
        ),
      serviceAccountPath: z
        .string()
        .optional()
        .describe(
          "Path to Firebase service account JSON. Absolute or relative to projectRoot. Overrides mcp.config.json firebase.serviceAccountPath.",
        ),
    },
  },
  async ({ projectRoot, token, title, body, data, serviceAccountPath }) => {
    const result = await sendTestPush({
      projectRoot,
      token,
      title,
      body,
      data,
      serviceAccountPath,
    });
    return { content: [{ type: "text", text: formatSendResult(result) }] };
  },
);

// ─── E2E testing ──────────────────────────────────────────────────────────────

server.registerTool(
  "run_e2e_test",
  {
    description:
      "Runs a Maestro E2E test flow from the project's .maestro/ directory and returns pass/fail output. Wraps `maestro test <flow>`. Call without a flow name to list available flows.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
      flow: z
        .string()
        .optional()
        .describe(
          'Maestro flow file name, e.g. "login.yaml". Relative to .maestro/ or absolute path. Omit to list available flows.',
        ),
    },
  },
  async ({ projectRoot, flow }) => {
    const flows = await listFlows(projectRoot);
    if (!flow) {
      const text =
        flows.length > 0
          ? `Available flows:\n${flows.map((f) => `- ${f}`).join("\n")}`
          : "No .maestro/*.yaml flows found in project.";
      return { content: [{ type: "text", text }] };
    }
    const result = await runE2eTest(projectRoot, flow);
    return { content: [{ type: "text", text: formatE2eResult(result, flows) }] };
  },
);

// ─── EAS builds ───────────────────────────────────────────────────────────────

server.registerTool(
  "eas_build_status",
  {
    description:
      "Returns recent EAS build status for the project using `eas build:list`. Shows build profile, platform, status, and links. Useful before triggering a new build or checking if CI succeeded.",
    inputSchema: {
      projectRoot: z.string().describe("Absolute path to the project root"),
      profile: z
        .string()
        .optional()
        .describe('Filter by build profile, e.g. "development", "staging", "production".'),
      platform: z
        .string()
        .optional()
        .describe('Filter by platform: "ios", "android", or "all". Default: all.'),
      limit: z
        .number()
        .optional()
        .describe("Number of recent builds to show. Default: 10."),
    },
  },
  async ({ projectRoot, profile, platform, limit }) => {
    try {
      const builds = await getEasBuildStatus(projectRoot, profile, platform, limit);
      return { content: [{ type: "text", text: formatEasStatus(builds) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `EAS error: ${msg}` }] };
    }
  },
);

// ─── Doppler / env vars prompt ────────────────────────────────────────────────

server.registerPrompt(
  "add_secret_doppler",
  {
    description:
      "Step-by-step guide for adding a new secret to Doppler and syncing it to the local .env. Covers all three required steps: env.template.yaml, doppler secrets set, and yarn sync-env-vars.",
    argsSchema: {
      varName: z.string().describe("The env var name to add, e.g. STRIPE_SECRET_KEY"),
      isClientSide: z
        .boolean()
        .optional()
        .describe("Whether the var needs EXPO_PUBLIC_ prefix for client-side access"),
    },
  },
  ({ varName, isClientSide }) => {
    const fullName = isClientSide ? `EXPO_PUBLIC_${varName}` : varName;
    const templateEntry = `${fullName}={{ .${fullName} }}`;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Add the secret \`${fullName}\` to the project following these three steps in order:`,
              "",
              "## Step 1 — env.template.yaml",
              `Add this line to \`env.template.yaml\`:`,
              "```yaml",
              templateEntry,
              "```",
              "",
              "## Step 2 — Doppler (all configs)",
              "Run for each config (dev, stg, prod):",
              "```bash",
              `doppler secrets set ${fullName}="<value>" --project <project> --config dev`,
              `doppler secrets set ${fullName}="<value>" --project <project> --config stg`,
              `doppler secrets set ${fullName}="<value>" --project <project> --config prod`,
              "```",
              "The project name is in `.mcp-project`, the default config in `.mcp-env`.",
              "",
              "## Step 3 — Sync to local .env",
              "```bash",
              "yarn sync-env-vars stg",
              "```",
              "",
              isClientSide
                ? `Note: \`EXPO_PUBLIC_\` prefix is required — this var will be accessible in client-side code.`
                : `Note: No \`EXPO_PUBLIC_\` prefix — this var is server-side only.`,
            ].join("\n"),
          },
        },
      ],
    };
  },
);

// ─── Start server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Expo MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

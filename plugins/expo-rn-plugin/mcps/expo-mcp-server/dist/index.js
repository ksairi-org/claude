"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const init_project_config_js_1 = require("./tools/init-project-config.js");
const get_components_js_1 = require("./tools/get-components.js");
const get_routes_js_1 = require("./tools/get-routes.js");
const get_config_js_1 = require("./tools/get-config.js");
const load_config_js_1 = require("./tools/load-config.js");
const i18n_check_js_1 = require("./tools/i18n-check.js");
const scaffold_form_js_1 = require("./tools/scaffold-form.js");
const scaffold_crud_js_1 = require("./tools/scaffold-crud.js");
const push_notifications_js_1 = require("./tools/push-notifications.js");
const run_e2e_test_js_1 = require("./tools/run-e2e-test.js");
const eas_build_status_js_1 = require("./tools/eas-build-status.js");
const design_tokens_js_1 = require("./tools/design-tokens.js");
const orval_api_surface_js_1 = require("./tools/orval-api-surface.js");
const server = new mcp_js_1.McpServer({
    name: "expo-mcp-server",
    version: "1.0.0",
});
// ─── Project inspection ───────────────────────────────────────────────────────
server.registerTool("get_config", {
    description: "Shows the current mcp.config.json for the project. Use this first to understand how the MCP server is configured for this specific project.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
    },
}, async ({ projectRoot }) => {
    const summary = await (0, get_config_js_1.getConfig)(projectRoot);
    return { content: [{ type: "text", text: summary }] };
});
server.registerTool("init_project_config", {
    description: "Creates mcp.config.json in the project root by auto-detecting the project structure (router, component directories, libs, i18n, orval). Run once when setting up a new project. Skips creation if the file already exists unless overwrite is true.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
        backend: zod_1.z
            .enum(["supabase", "firebase", "rest"])
            .optional()
            .describe('Backend to use for data. Defaults to "supabase".'),
        supabaseSchema: zod_1.z
            .string()
            .optional()
            .describe('Supabase schema name. Only used when backend is "supabase". Defaults to "api".'),
        schemaPath: zod_1.z
            .string()
            .optional()
            .describe('Path to schema.json (relative to projectRoot or absolute). Required when backend is "firebase" or "rest".'),
        sourceLocale: zod_1.z
            .string()
            .optional()
            .describe('Source locale for i18n. Defaults to "en".'),
        targetLocales: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe('Target locales for i18n. Defaults to ["es"].'),
        overwrite: zod_1.z
            .boolean()
            .optional()
            .describe("Overwrite existing mcp.config.json. Default: false."),
    },
}, async ({ projectRoot, backend, supabaseSchema, schemaPath, sourceLocale, targetLocales, overwrite }) => {
    const result = await (0, init_project_config_js_1.initProjectConfig)({ projectRoot, backend, supabaseSchema, schemaPath, sourceLocale, targetLocales, overwrite });
    return { content: [{ type: "text", text: (0, init_project_config_js_1.formatInitResult)(result) }] };
});
server.registerTool("get_components", {
    description: "Returns all UI components available in the project (atoms, molecules, organisms, screens, libs) with their props. Use this before generating any screen or component to avoid duplicating existing work and to use correct component names and props.",
    inputSchema: {
        projectRoot: zod_1.z
            .string()
            .describe("Absolute path to the React Native project root, e.g. /Users/you/projects/my-app"),
        summary: zod_1.z
            .boolean()
            .optional()
            .describe("Return component names only (no props or paths). Use when you only need to check what exists before generating new components. Default: false."),
    },
}, async ({ projectRoot, summary }) => {
    const { library, config } = await (0, get_components_js_1.getComponents)(projectRoot);
    return {
        content: [{ type: "text", text: (0, get_components_js_1.formatComponentLibrary)(library, config, summary) }],
    };
});
server.registerTool("get_routes", {
    description: "Returns the full Expo Router route structure of the app including route groups, existing screens, and which components/hooks each screen uses. Use this before adding a new screen to know exactly where to place it.",
    inputSchema: {
        projectRoot: zod_1.z
            .string()
            .describe("Absolute path to the React Native project root, e.g. /Users/you/projects/my-app"),
    },
}, async ({ projectRoot }) => {
    const structure = await (0, get_routes_js_1.getRoutes)(projectRoot);
    return {
        content: [{ type: "text", text: (0, get_routes_js_1.formatRouteStructure)(structure) }],
    };
});
server.registerTool("get_design_tokens", {
    description: "Returns all Tamagui design tokens defined in the project (colors, spacing, radius, typography). Use this before writing any styled component to pick correct $token references. Raw hex/rgba strings will error at compile time.",
    inputSchema: {
        projectRoot: zod_1.z
            .string()
            .describe("Absolute path to the React Native project root"),
    },
}, async ({ projectRoot }) => {
    const tokens = await (0, design_tokens_js_1.getDesignTokens)(projectRoot);
    return {
        content: [{ type: "text", text: (0, design_tokens_js_1.formatDesignTokens)(tokens, projectRoot) }],
    };
});
server.registerTool("get_orval_api_surface", {
    description: "Returns all hooks and types exported by the orval-generated API SDK. Use this before writing any data-fetching code to reuse existing hooks instead of writing manual Supabase queries. Run `yarn orval` first if the SDK is out of date.",
    inputSchema: {
        projectRoot: zod_1.z
            .string()
            .describe("Absolute path to the React Native project root"),
    },
}, async ({ projectRoot }) => {
    const files = await (0, orval_api_surface_js_1.getOrvalApiSurface)(projectRoot);
    return {
        content: [{ type: "text", text: (0, orval_api_surface_js_1.formatApiSurface)(files) }],
    };
});
// ─── Scaffolding ──────────────────────────────────────────────────────────────
server.registerTool("scaffold_form", {
    description: "Generates a Zod schema, react-hook-form hook, and React Native form component from a table or collection. For Supabase projects the schema is read from the database automatically; for Firebase and REST projects it reads from the schema.json file configured in mcp.config.json.",
    inputSchema: {
        tableName: zod_1.z
            .string()
            .describe('Name of the table or collection to scaffold a form for, e.g. "transactions"'),
        projectRoot: zod_1.z
            .string()
            .describe("Absolute path to the React Native project root"),
        omitAutoFields: zod_1.z
            .boolean()
            .optional()
            .describe("Skip auto-managed columns (id, created_at, updated_at, deleted_at). Default: true"),
    },
}, async ({ tableName, projectRoot, omitAutoFields }) => {
    const result = await (0, scaffold_form_js_1.scaffoldForm)({ tableName, projectRoot, omitAutoFields });
    return {
        content: [{ type: "text", text: (0, scaffold_form_js_1.formatScaffoldResult)(result) }],
    };
});
server.registerTool("scaffold_crud", {
    description: "Generates TypeScript types, react-query CRUD hooks, List/Detail/Create screens, and Expo Router route files from a table or collection. Works with Supabase (auto-introspects schema), Firebase (Firestore hooks), and plain REST APIs. Run scaffold_form first (or alongside) to get the form component the detail and create screens depend on.",
    inputSchema: {
        tableName: zod_1.z
            .string()
            .describe('Name of the table in the api schema to scaffold CRUD for, e.g. "wallets"'),
        projectRoot: zod_1.z
            .string()
            .describe("Absolute path to the React Native project root, e.g. /Users/you/projects/my-app"),
        omitAutoFields: zod_1.z
            .boolean()
            .optional()
            .describe("Skip auto-managed columns (id, created_at, updated_at, deleted_at) from write types. Default: true"),
        includeForm: zod_1.z
            .boolean()
            .optional()
            .describe("Generate form-based detail and create screens that depend on the scaffold_form output. Default: false — detail screen is read-only, no create screen is generated."),
    },
}, async ({ tableName, projectRoot, omitAutoFields, includeForm }) => {
    const result = await (0, scaffold_crud_js_1.scaffoldCrud)({ tableName, projectRoot, omitAutoFields, includeForm });
    return {
        content: [{ type: "text", text: (0, scaffold_crud_js_1.formatScaffoldCrudResult)(result) }],
    };
});
// ─── i18n ─────────────────────────────────────────────────────────────────────
server.registerTool("i18n_check", {
    description: "Check Lingui i18n catalogs for untranslated strings, missing keys across locales, and hardcoded text in source files. Optionally runs `lingui extract --clean` first to sync catalogs with source before checking.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
        extract: zod_1.z
            .boolean()
            .optional()
            .describe("Run `lingui extract --clean` before checking. Updates catalogs from source first. Slower (~5–15s) but gives accurate results on unsaved work. Default: false."),
        checks: zod_1.z
            .array(zod_1.z.enum([
            "untranslated",
            "missing_keys",
            "hardcoded",
            "variable_mismatch",
            "plural_forms",
        ]))
            .optional()
            .describe("Which checks to run. Defaults to [untranslated, missing_keys, hardcoded]. Opt-in extras: variable_mismatch (detects {placeholder} dropped/renamed in translations), plural_forms (detects missing ICU plural categories for the target locale)."),
    },
}, async ({ projectRoot, extract, checks }) => {
    const config = await (0, load_config_js_1.loadConfig)(projectRoot);
    const result = await (0, i18n_check_js_1.runI18nCheck)(projectRoot, config, { extract, checks });
    const lines = [];
    const s = result.summary;
    const totals = Object.entries(s)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
    lines.push(`## i18n check summary\n${totals}`);
    if (result.errors.length > 0) {
        lines.push(`\n### Errors\n${result.errors.map((e) => `- ${e}`).join("\n")}`);
    }
    if (result.untranslated.length > 0) {
        lines.push(`\n### Untranslated (${result.untranslated.length})\n` +
            result.untranslated.map((r) => `- [${r.locale}] ${r.key} (${r.reason})`).join("\n"));
    }
    if (result.missingKeys.length > 0) {
        lines.push(`\n### Missing keys (${result.missingKeys.length})\n` +
            result.missingKeys
                .map((r) => `- [${r.locale}] ${r.key} — source: "${r.sourceValue}"`)
                .join("\n"));
    }
    if (result.hardcoded.length > 0) {
        lines.push(`\n### Hardcoded strings (${result.hardcoded.length})\n` +
            result.hardcoded
                .map((r) => `- ${r.file}:${r.line} "${r.text}" (${r.context})`)
                .join("\n"));
    }
    if (result.variableMismatches && result.variableMismatches.length > 0) {
        lines.push(`\n### Variable mismatches (${result.variableMismatches.length})\n` +
            result.variableMismatches
                .map((r) => `- [${r.locale}] ${r.key}` +
                (r.missingVars.length ? ` missing: {${r.missingVars.join("}, {")}}` : "") +
                (r.extraVars.length ? ` extra: {${r.extraVars.join("}, {")}}` : ""))
                .join("\n"));
    }
    if (result.pluralFormIssues && result.pluralFormIssues.length > 0) {
        lines.push(`\n### Plural form issues (${result.pluralFormIssues.length})\n` +
            result.pluralFormIssues
                .map((r) => `- [${r.locale}] ${r.key} — expected: [${r.expectedForms.join(", ")}] found: [${r.foundForms.join(", ")}]`)
                .join("\n"));
    }
    if (result.extraction) {
        const ex = result.extraction;
        if (ex.newKeys.length > 0 || ex.removedKeys.length > 0) {
            lines.push(`\n### Extract changes\n` +
                (ex.newKeys.length ? `New keys (${ex.newKeys.length}): ${ex.newKeys.slice(0, 10).join(", ")}${ex.newKeys.length > 10 ? "…" : ""}` : "") +
                (ex.removedKeys.length ? `\nRemoved keys (${ex.removedKeys.length}): ${ex.removedKeys.slice(0, 10).join(", ")}${ex.removedKeys.length > 10 ? "…" : ""}` : ""));
        }
    }
    return {
        content: [{ type: "text", text: lines.join("\n") }],
    };
});
// ─── Push notifications ───────────────────────────────────────────────────────
server.registerTool("inspect_push_tokens", {
    description: "Inspect FCM push tokens stored in your backend. For Supabase projects: queries the device tokens table and returns counts by platform, recent tokens, and a migration if the table is missing. For Firebase and REST projects: returns guidance on how to inspect tokens directly.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
        tableName: zod_1.z
            .string()
            .optional()
            .describe('Name of the table that stores device tokens. Defaults to the value in mcp.config.json firebase.deviceTokensTable, or "device_tokens".'),
        limit: zod_1.z
            .number()
            .optional()
            .describe("Number of recent tokens to return. Default: 10."),
    },
}, async ({ projectRoot, tableName, limit }) => {
    const result = await (0, push_notifications_js_1.inspectPushTokens)({ projectRoot, tableName, limit });
    return { content: [{ type: "text", text: (0, push_notifications_js_1.formatInspectResult)(result) }] };
});
server.registerTool("send_test_push", {
    description: "Send a test FCM push notification to a specific device token using the Firebase v1 HTTP API. Requires a Firebase service account JSON (path set in mcp.config.json or passed directly). Use inspect_push_tokens to find tokens to test with.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
        token: zod_1.z.string().describe("FCM device token to send the notification to"),
        title: zod_1.z.string().describe("Notification title"),
        body: zod_1.z.string().describe("Notification body text"),
        data: zod_1.z
            .record(zod_1.z.string(), zod_1.z.string())
            .optional()
            .describe("Optional key-value data payload (all values must be strings)"),
        serviceAccountPath: zod_1.z
            .string()
            .optional()
            .describe("Path to Firebase service account JSON. Absolute or relative to projectRoot. Overrides mcp.config.json firebase.serviceAccountPath."),
    },
}, async ({ projectRoot, token, title, body, data, serviceAccountPath }) => {
    const result = await (0, push_notifications_js_1.sendTestPush)({
        projectRoot,
        token,
        title,
        body,
        data,
        serviceAccountPath,
    });
    return { content: [{ type: "text", text: (0, push_notifications_js_1.formatSendResult)(result) }] };
});
// ─── E2E testing ──────────────────────────────────────────────────────────────
server.registerTool("run_e2e_test", {
    description: "Runs a Maestro E2E test flow from the project's .maestro/ directory and returns pass/fail output. Wraps `maestro test <flow>`. Call without a flow name to list available flows.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
        flow: zod_1.z
            .string()
            .optional()
            .describe('Maestro flow file name, e.g. "login.yaml". Relative to .maestro/ or absolute path. Omit to list available flows.'),
    },
}, async ({ projectRoot, flow }) => {
    const flows = await (0, run_e2e_test_js_1.listFlows)(projectRoot);
    if (!flow) {
        const text = flows.length > 0
            ? `Available flows:\n${flows.map((f) => `- ${f}`).join("\n")}`
            : "No .maestro/*.yaml flows found in project.";
        return { content: [{ type: "text", text }] };
    }
    const result = await (0, run_e2e_test_js_1.runE2eTest)(projectRoot, flow);
    return { content: [{ type: "text", text: (0, run_e2e_test_js_1.formatE2eResult)(result, flows) }] };
});
// ─── EAS builds ───────────────────────────────────────────────────────────────
server.registerTool("eas_build_status", {
    description: "Returns recent EAS build status for the project using `eas build:list`. Shows build profile, platform, status, and links. Useful before triggering a new build or checking if CI succeeded.",
    inputSchema: {
        projectRoot: zod_1.z.string().describe("Absolute path to the project root"),
        profile: zod_1.z
            .string()
            .optional()
            .describe('Filter by build profile, e.g. "development", "staging", "production".'),
        platform: zod_1.z
            .string()
            .optional()
            .describe('Filter by platform: "ios", "android", or "all". Default: all.'),
        limit: zod_1.z
            .number()
            .optional()
            .describe("Number of recent builds to show. Default: 10."),
    },
}, async ({ projectRoot, profile, platform, limit }) => {
    try {
        const builds = await (0, eas_build_status_js_1.getEasBuildStatus)(projectRoot, profile, platform, limit);
        return { content: [{ type: "text", text: (0, eas_build_status_js_1.formatEasStatus)(builds) }] };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `EAS error: ${msg}` }] };
    }
});
// ─── Doppler / env vars prompt ────────────────────────────────────────────────
server.registerPrompt("add_secret_doppler", {
    description: "Step-by-step guide for adding a new secret to Doppler and syncing it to the local .env. Covers all three required steps: env.template.yaml, doppler secrets set, and yarn sync-env-vars.",
    argsSchema: {
        varName: zod_1.z.string().describe("The env var name to add, e.g. STRIPE_SECRET_KEY"),
        isClientSide: zod_1.z
            .boolean()
            .optional()
            .describe("Whether the var needs EXPO_PUBLIC_ prefix for client-side access"),
    },
}, ({ varName, isClientSide }) => {
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
                        "Configure the Doppler project via `/plugin configure expo-rn-plugin`.",
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
});
// ─── Start server ─────────────────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Expo MCP Server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});

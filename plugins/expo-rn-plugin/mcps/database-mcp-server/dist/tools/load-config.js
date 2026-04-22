"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.configSummary = configSummary;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const DEFAULTS = {
    supabase: {
        schema: "public",
    },
    components: {
        atoms: "src/components/atoms",
        molecules: "src/components/molecules",
        organisms: "src/components/organisms",
        screens: "src/screens",
    },
    libs: [],
    router: "expo-router",
    routesDir: "src/app",
};
async function loadConfig(projectRoot) {
    const configPath = (0, path_1.join)(projectRoot, "mcp.config.json");
    try {
        const raw = await (0, promises_1.readFile)(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        // Deep merge with defaults
        return {
            supabase: { ...DEFAULTS.supabase, ...parsed.supabase },
            components: { ...DEFAULTS.components, ...parsed.components },
            libs: parsed.libs ?? DEFAULTS.libs,
            router: parsed.router ?? DEFAULTS.router,
            routesDir: parsed.routesDir ?? DEFAULTS.routesDir,
            i18n: parsed.i18n,
            firebase: parsed.firebase,
        };
    }
    catch {
        // No config file found — use defaults silently
        return DEFAULTS;
    }
}
function configSummary(config) {
    const lines = [
        "# MCP Config",
        `Supabase schema: ${config.supabase.schema}`,
        `Router: ${config.router}`,
        `Routes dir: ${config.routesDir}`,
        "",
        "Component paths:",
        ...Object.entries(config.components).map(([k, v]) => `  ${k}: ${v}`),
    ];
    if (config.libs.length > 0) {
        lines.push("", "Libs scanned:");
        lines.push(...config.libs.map((l) => `  ${l}`));
    }
    else {
        lines.push("", "Libs: none configured");
    }
    if (config.i18n) {
        const { localesDir, sourceLocale, targetLocales, catalogFormat } = config.i18n;
        lines.push("", "i18n (Lingui):", `  Locales dir: ${localesDir}`, `  Source locale: ${sourceLocale}`, `  Target locales: ${targetLocales.join(", ")}`, `  Format: ${catalogFormat ?? "po"}`, "", "i18n conventions (always apply when generating screens or components):", "  - Import the `t` macro and `Trans` component from `@lingui/macro`", "  - Wrap all user-facing strings with `t\\`...\\`` (for expressions) or `<Trans>...</Trans>` (for JSX)", "  - Never hardcode raw string literals in JSX or as prop values meant for display");
    }
    return lines.join("\n");
}

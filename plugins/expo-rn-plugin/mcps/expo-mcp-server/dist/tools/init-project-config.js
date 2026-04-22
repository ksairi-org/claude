"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initProjectConfig = initProjectConfig;
exports.formatInitResult = formatInitResult;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const glob_1 = require("glob");
async function exists(path) {
    try {
        await (0, promises_1.access)(path);
        return true;
    }
    catch {
        return false;
    }
}
async function detectRouter(projectRoot) {
    const appDir = (0, path_1.join)(projectRoot, "src", "app");
    const pagesDir = (0, path_1.join)(projectRoot, "app");
    if (await exists(appDir))
        return { router: "expo-router", routesDir: "src/app" };
    if (await exists(pagesDir))
        return { router: "expo-router", routesDir: "app" };
    return { router: "react-navigation", routesDir: "src/app" };
}
async function detectComponents(projectRoot) {
    const candidates = {
        atoms: ["src/components/atoms", "src/ui/atoms", "src/components/ui"],
        molecules: ["src/components/molecules", "src/ui/molecules"],
        organisms: ["src/components/organisms", "src/ui/organisms"],
        screens: ["src/screens", "src/views", "src/pages"],
    };
    const resolved = {};
    for (const [key, paths] of Object.entries(candidates)) {
        for (const p of paths) {
            if (await exists((0, path_1.join)(projectRoot, p))) {
                resolved[key] = p;
                break;
            }
        }
        if (!resolved[key]) {
            resolved[key] = candidates[key][0];
        }
    }
    return resolved;
}
async function detectLibs(projectRoot) {
    const libsDir = (0, path_1.join)(projectRoot, "libs");
    if (!(await exists(libsDir)))
        return [];
    const dirs = await (0, glob_1.glob)("libs/*/", { cwd: projectRoot });
    return dirs.map((d) => d.replace(/\/$/, ""));
}
async function detectI18n(projectRoot) {
    const candidates = ["src/i18n/locales", "src/locales", "locales"];
    for (const dir of candidates) {
        if (await exists((0, path_1.join)(projectRoot, dir))) {
            return {
                localesDir: dir,
                sourceLocale: "en",
                targetLocales: ["es"],
                sourceGlobs: ["src/**/*.{ts,tsx}"],
                catalogFormat: "po",
            };
        }
    }
    return undefined;
}
async function detectOrval(projectRoot) {
    const candidates = ["libs/react-query-sdk", "src/api", "src/sdk"];
    for (const dir of candidates) {
        if (await exists((0, path_1.join)(projectRoot, dir))) {
            return { sdkLib: dir };
        }
    }
    return undefined;
}
async function initProjectConfig(options) {
    const { projectRoot, backend = "supabase", supabaseSchema = "api", schemaPath, sourceLocale = "en", targetLocales = ["es"], overwrite = false, } = options;
    const configPath = (0, path_1.join)(projectRoot, "mcp.config.json");
    const warnings = [];
    if (!overwrite && (await exists(configPath))) {
        const existing = JSON.parse(await (0, promises_1.readFile)(configPath, "utf-8"));
        return { created: false, skipped: true, path: configPath, config: existing, warnings };
    }
    const [{ router, routesDir }, components, libs, i18n, orval] = await Promise.all([
        detectRouter(projectRoot),
        detectComponents(projectRoot),
        detectLibs(projectRoot),
        detectI18n(projectRoot),
        detectOrval(projectRoot),
    ]);
    if (!i18n)
        warnings.push("No i18n locales directory detected — add the i18n section manually if you use Lingui.");
    if (!orval)
        warnings.push("No orval SDK directory detected — add the orval section manually if you use orval.");
    if (backend !== "supabase" && !schemaPath) {
        warnings.push(`backend is "${backend}" but no schemaPath was provided. Add "schemaPath": "schema.json" to mcp.config.json and create the file.`);
    }
    const config = { backend, components, libs, router, routesDir };
    if (backend === "supabase") {
        config.supabase = { schema: supabaseSchema };
    }
    if (schemaPath) {
        config.schemaPath = schemaPath;
    }
    if (orval)
        config.orval = orval;
    if (i18n) {
        config.i18n = { ...i18n, sourceLocale, targetLocales };
    }
    await (0, promises_1.writeFile)(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    return { created: true, skipped: false, path: configPath, config, warnings };
}
function formatInitResult(result) {
    if (result.skipped) {
        return [
            `## mcp.config.json already exists`,
            `Path: ${result.path}`,
            ``,
            `Use \`overwrite: true\` to replace it.`,
            ``,
            `Current config:`,
            "```json",
            JSON.stringify(result.config, null, 2),
            "```",
        ].join("\n");
    }
    const lines = [
        `## mcp.config.json created`,
        `Path: ${result.path}`,
        ``,
        "```json",
        JSON.stringify(result.config, null, 2),
        "```",
    ];
    if (result.warnings.length > 0) {
        lines.push("", "**Warnings:**");
        result.warnings.forEach((w) => lines.push(`- ${w}`));
    }
    return lines.join("\n");
}

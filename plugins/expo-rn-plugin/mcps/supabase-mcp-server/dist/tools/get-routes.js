"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutes = getRoutes;
exports.formatRouteStructure = formatRouteStructure;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const load_config_1 = require("./load-config");
function extractImports(source) {
    const components = [];
    const queryHooks = [];
    const importLines = source.match(/^import\s+.+from\s+['"].+['"]/gm) ?? [];
    for (const line of importLines) {
        const namedMatch = line.match(/import\s+\{([^}]+)\}/);
        if (namedMatch) {
            const names = namedMatch[1]
                .split(",")
                .map((n) => n.trim().split(" as ")[0].trim())
                .filter(Boolean);
            for (const name of names) {
                if (name.startsWith("use") &&
                    (name.includes("Query") ||
                        name.includes("Mutation") ||
                        name.includes("Get") ||
                        name.includes("Post") ||
                        name.includes("Put") ||
                        name.includes("Patch") ||
                        name.includes("Delete"))) {
                    queryHooks.push(name);
                }
                else if (/^[A-Z]/.test(name)) {
                    components.push(name);
                }
            }
        }
        const defaultMatch = line.match(/import\s+([A-Z]\w+)\s+from/);
        if (defaultMatch)
            components.push(defaultMatch[1]);
    }
    return {
        components: [...new Set(components)],
        queryHooks: [...new Set(queryHooks)],
    };
}
function deriveRoutePath(filePath, appDir) {
    return filePath
        .replace(appDir, "")
        .replace(/^\//, "")
        .replace(/\.(tsx|ts)$/, "")
        .replace(/\/index$/, "");
}
function deriveGroup(routePath) {
    const groupMatch = routePath.match(/^\((\w+)\)/);
    return groupMatch ? groupMatch[1] : "root";
}
async function scanRoutes(dirPath, appDir, routes) {
    let entries;
    try {
        entries = await (0, promises_1.readdir)(dirPath, { withFileTypes: true });
    }
    catch {
        return;
    }
    const hasLayout = entries.some((e) => e.name === "_layout.tsx" || e.name === "_layout.ts");
    for (const entry of entries) {
        const fullPath = (0, path_1.join)(dirPath, entry.name);
        if (entry.isDirectory()) {
            await scanRoutes(fullPath, appDir, routes);
            continue;
        }
        const ext = (0, path_1.extname)(entry.name);
        if (![".tsx", ".ts"].includes(ext))
            continue;
        if (entry.name.startsWith("_"))
            continue;
        const routePath = deriveRoutePath(fullPath, appDir);
        const group = deriveGroup(routePath);
        try {
            const source = await (0, promises_1.readFile)(fullPath, "utf-8");
            const { components, queryHooks } = extractImports(source);
            routes.push({
                path: routePath,
                filePath: fullPath,
                group,
                hasLayout,
                queryHooks,
                components,
            });
        }
        catch {
            // skip
        }
    }
}
async function getRoutes(projectRoot) {
    const config = await (0, load_config_1.loadConfig)(projectRoot);
    const appDir = (0, path_1.join)(projectRoot, config.routesDir);
    const routes = [];
    await scanRoutes(appDir, appDir, routes);
    const groups = [...new Set(routes.map((r) => r.group))];
    const groupedRoutes = groups.map((group) => {
        const groupRoutes = routes.filter((r) => r.group === group);
        const routeList = groupRoutes.map((r) => `  - ${r.path}`).join("\n");
        return `(${group}):\n${routeList}`;
    });
    const summary = [
        `Total screens: ${routes.length}`,
        `Route groups: ${groups.map((g) => `(${g})`).join(", ")}`,
        `Router: ${config.router}`,
        `Routes dir: ${config.routesDir}`,
        "",
        "Structure:",
        ...groupedRoutes,
    ].join("\n");
    return { routes, groups, summary };
}
function formatRouteStructure(structure) {
    const lines = [
        "# Expo Router Structure",
        "",
        structure.summary,
        "",
        "# Screen Details",
    ];
    for (const route of structure.routes) {
        lines.push(`\n## /${route.path}`);
        lines.push(`File: ${route.filePath}`);
        lines.push(`Group: (${route.group})`);
        if (route.queryHooks.length > 0) {
            lines.push(`Query hooks: ${route.queryHooks.join(", ")}`);
        }
        if (route.components.length > 0) {
            lines.push(`Components used: ${route.components.join(", ")}`);
        }
    }
    lines.push("\n# Where to add new screens");
    const appScreenPath = structure.routes
        .find((r) => r.group === "app")
        ?.filePath.split("/")
        .slice(0, -1)
        .join("/") || "src/app/(app)/";
    lines.push("- Authenticated screens → " + appScreenPath);
    lines.push("- Auth flow screens → src/app/(auth)/");
    lines.push("- Onboarding screens → src/app/(onboarding)/");
    return lines.join("\n");
}

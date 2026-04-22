"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComponents = getComponents;
exports.formatComponentLibrary = formatComponentLibrary;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const load_config_1 = require("./load-config");
// ─── Non-component filenames to skip ─────────────────────────────────────────
const SKIP_FILES = new Set([
    "Inter",
    "svg-imports",
    "images",
    "Circle",
    "index",
    "types",
    "constants",
    "utils",
    "helpers",
    "theme",
    "tokens",
    "styles",
]);
function isLikelyComponent(fileName, source) {
    const name = fileName.replace(/\.(tsx|ts)$/, "");
    if (SKIP_FILES.has(name))
        return false;
    if (fileName.includes(".d.ts"))
        return false;
    const hasJSX = /<[A-Z]/.test(source) || /return\s*\(/.test(source);
    const hasReactImport = /from ['"]react['"]/.test(source);
    return hasJSX || hasReactImport;
}
// ─── Prop extractor ──────────────────────────────────────────────────────────
function extractProps(source, componentName) {
    const props = [];
    const interfacePatterns = [
        new RegExp(`interface\\s+${componentName}Props\\s*\\{([^}]+)\\}`, "s"),
        /interface\s+Props\s*\{([^}]+)\}/s,
        /type\s+Props\s*=\s*\{([^}]+)\}/s,
        new RegExp(`type\\s+${componentName}Props\\s*=\\s*\\{([^}]+)\\}`, "s"),
    ];
    let propsBlock = "";
    for (const pattern of interfacePatterns) {
        const match = source.match(pattern);
        if (match) {
            propsBlock = match[1];
            break;
        }
    }
    if (!propsBlock)
        return [];
    const lines = propsBlock
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    for (const line of lines) {
        if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*"))
            continue;
        const propMatch = line.match(/^(\w+)(\??):\s*(.+?);?\s*$/);
        if (propMatch) {
            props.push({
                name: propMatch[1],
                required: propMatch[2] !== "?",
                type: propMatch[3].replace(/;$/, "").trim(),
            });
        }
    }
    return props;
}
// ─── File scanner ─────────────────────────────────────────────────────────────
async function scanDirectory(dirPath) {
    const components = [];
    let entries;
    try {
        entries = await (0, promises_1.readdir)(dirPath, { withFileTypes: true });
    }
    catch {
        return [];
    }
    for (const entry of entries) {
        const fullPath = (0, path_1.join)(dirPath, entry.name);
        if (entry.isDirectory()) {
            components.push(...(await scanDirectory(fullPath)));
            continue;
        }
        const ext = (0, path_1.extname)(entry.name);
        if (![".tsx", ".ts"].includes(ext))
            continue;
        if (entry.name.includes(".test.") || entry.name.includes(".spec."))
            continue;
        try {
            const source = await (0, promises_1.readFile)(fullPath, "utf-8");
            if (!isLikelyComponent(entry.name, source))
                continue;
            const componentName = entry.name.replace(/\.(tsx|ts)$/, "");
            const hasDefaultExport = /export\s+default/.test(source);
            const hasNamedExport = new RegExp(`export\\s+(const|function|class)\\s+${componentName}`).test(source) ||
                new RegExp(`export\\s+\\{[^}]*${componentName}[^}]*\\}`).test(source);
            if (!hasDefaultExport && !hasNamedExport)
                continue;
            components.push({
                name: componentName,
                path: fullPath,
                props: extractProps(source, componentName),
                exportType: hasDefaultExport ? "default" : "named",
            });
        }
        catch {
            // skip unreadable files
        }
    }
    return components;
}
// ─── Main exported function ──────────────────────────────────────────────────
async function getComponents(projectRoot) {
    const config = await (0, load_config_1.loadConfig)(projectRoot);
    const library = {};
    // Scan named component categories from config
    const categoryScans = Object.entries(config.components).map(async ([category, relativePath]) => {
        if (!relativePath)
            return;
        library[category] = await scanDirectory((0, path_1.join)(projectRoot, relativePath));
    });
    // Scan libs — each lib becomes its own category named after the folder
    const libScans = config.libs.map(async (libPath) => {
        const category = libPath.split("/").pop() ?? libPath;
        library[category] = await scanDirectory((0, path_1.join)(projectRoot, libPath));
    });
    await Promise.all([...categoryScans, ...libScans]);
    return { library, config };
}
// ─── Formatter for Claude ────────────────────────────────────────────────────
function formatComponentLibrary(library, config, summaryOnly = false) {
    const sections = [];
    for (const [category, components] of Object.entries(library)) {
        if (components.length === 0)
            continue;
        if (summaryOnly) {
            sections.push(`## ${category} (${components.length})\n${components.map((c) => `- ${c.name}`).join("\n")}`);
            continue;
        }
        const lines = [`## ${category} (${components.length})`];
        for (const comp of components) {
            const required = comp.props.filter((p) => p.required);
            const optional = comp.props.filter((p) => !p.required);
            lines.push(`\n### ${comp.name} (${comp.exportType} export)`);
            lines.push(`Path: ${comp.path}`);
            if (required.length > 0) {
                lines.push(`Required: ${required.map((p) => `${p.name}: ${p.type}`).join(", ")}`);
            }
            if (optional.length > 0) {
                lines.push(`Optional: ${optional.map((p) => `${p.name}?: ${p.type}`).join(", ")}`);
            }
            if (comp.props.length === 0) {
                lines.push("Props: none detected");
            }
        }
        sections.push(lines.join("\n"));
    }
    // ─── Scaffolding rules ───────────────────────────────────────────────────
    const rules = [
        "## Scaffolding rules (always apply when generating screens or components)",
        "",
        "### Imports",
        "- NEVER split imports from the same module across multiple import statements.",
        "  Consolidate all named imports from a path into one line.",
        "  BAD:  import { A } from '@molecules'; import { B } from '@molecules';",
        "  GOOD: import { A, B } from '@molecules';",
        "  Violation triggers the `import/no-duplicates` ESLint error.",
    ];
    if (config.i18n) {
        rules.push("", "### i18n (Lingui)", "- This project uses Lingui. ALL user-visible strings must be internationalised.", "- Import: `import { Trans, useLingui } from '@lingui/react/macro';`", "- JSX text → `<Trans>Your string</Trans>`", "- Prop strings (placeholder, title, etc.) → `const { t } = useLingui(); t\\`Your string\\``", "- Never pass a raw string literal where a user will see it.");
    }
    sections.push(rules.join("\n"));
    return sections.join("\n\n");
}

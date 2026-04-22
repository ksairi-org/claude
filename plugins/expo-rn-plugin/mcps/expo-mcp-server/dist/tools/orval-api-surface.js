"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrvalApiSurface = getOrvalApiSurface;
exports.formatApiSurface = formatApiSurface;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const load_config_js_1 = require("./load-config.js");
const CANDIDATE_DIRS = [
    "libs/react-query-sdk",
    "src/api",
    "src/sdk",
    "src/generated",
];
async function findSdkDir(projectRoot, sdkLib) {
    const candidates = sdkLib ? [sdkLib, ...CANDIDATE_DIRS] : CANDIDATE_DIRS;
    for (const candidate of candidates) {
        try {
            await (0, promises_1.readdir)((0, path_1.join)(projectRoot, candidate));
            return (0, path_1.join)(projectRoot, candidate);
        }
        catch {
            continue;
        }
    }
    return null;
}
function extractExports(content) {
    const exports = [];
    const namedPattern = /^export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/gm;
    let match;
    while ((match = namedPattern.exec(content)) !== null) {
        exports.push(match[1]);
    }
    const blockPattern = /^export\s+\{([^}]+)\}/gm;
    while ((match = blockPattern.exec(content)) !== null) {
        const names = match[1]
            .split(",")
            .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
            .filter(Boolean);
        exports.push(...names);
    }
    return [...new Set(exports)];
}
async function scanDir(dir, projectRoot, results) {
    let entries;
    try {
        entries = await (0, promises_1.readdir)(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        const fullPath = (0, path_1.join)(dir, entry.name);
        if (entry.isDirectory()) {
            await scanDir(fullPath, projectRoot, results);
            continue;
        }
        const ext = (0, path_1.extname)(entry.name);
        if (![".ts", ".tsx"].includes(ext))
            continue;
        if (/\.(test|spec)\./.test(entry.name))
            continue;
        try {
            const content = await (0, promises_1.readFile)(fullPath, "utf-8");
            const exports = extractExports(content);
            if (exports.length > 0) {
                results.push({
                    name: entry.name.replace(ext, ""),
                    relativePath: fullPath.replace(projectRoot + "/", ""),
                    exports,
                });
            }
        }
        catch {
            // skip unreadable files
        }
    }
}
async function getOrvalApiSurface(projectRoot) {
    const config = await (0, load_config_js_1.loadConfig)(projectRoot);
    const sdkLib = config.orval?.sdkLib;
    const sdkDir = await findSdkDir(projectRoot, sdkLib);
    if (!sdkDir)
        return [];
    const results = [];
    await scanDir(sdkDir, projectRoot, results);
    return results;
}
function formatApiSurface(files) {
    if (files.length === 0) {
        return [
            "No orval-generated SDK found.",
            "",
            "Run `yarn orval` to generate it, then ensure `mcp.config.json` has:",
            '```json',
            '{ "orval": { "sdkLib": "libs/react-query-sdk" } }',
            '```',
        ].join("\n");
    }
    const totalExports = files.reduce((acc, f) => acc + f.exports.length, 0);
    const lines = [
        "# Orval API Surface",
        "",
        `${files.length} files · ${totalExports} exports`,
        "Use these hooks and types — do not write database queries manually.",
        "",
    ];
    for (const f of files) {
        lines.push(`## ${f.name}`, `File: ${f.relativePath}`);
        if (f.exports.length > 0) {
            lines.push(`Exports: ${f.exports.join(", ")}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

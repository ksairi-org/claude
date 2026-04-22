"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDesignTokens = getDesignTokens;
exports.formatDesignTokens = formatDesignTokens;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const CANDIDATE_DIRS = [
    "src/theme/tokens",
    "src/theme",
    "src/tokens",
    "src/design-tokens",
];
async function findTokensDir(projectRoot) {
    for (const candidate of CANDIDATE_DIRS) {
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
async function getDesignTokens(projectRoot) {
    const tokensDir = await findTokensDir(projectRoot);
    if (!tokensDir)
        return [];
    const entries = await (0, promises_1.readdir)(tokensDir, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
        if (entry.isDirectory())
            continue;
        const ext = (0, path_1.extname)(entry.name);
        if (![".ts", ".js"].includes(ext))
            continue;
        const fullPath = (0, path_1.join)(tokensDir, entry.name);
        const content = await (0, promises_1.readFile)(fullPath, "utf-8");
        results.push({
            name: entry.name.replace(ext, ""),
            relativePath: fullPath.replace(projectRoot + "/", ""),
            content,
        });
    }
    return results;
}
function formatDesignTokens(tokens, projectRoot) {
    if (tokens.length === 0) {
        const checked = CANDIDATE_DIRS.map((d) => `  - ${d}`).join("\n");
        return `No design token files found. Checked:\n${checked}`;
    }
    const lines = [
        "# Design Tokens",
        "",
        "Use $token references — raw hex/rgba strings will error at compile time.",
        "",
    ];
    for (const token of tokens) {
        lines.push(`## ${token.name}`, `File: ${token.relativePath}`, "", "```typescript", token.content.trim(), "```", "");
    }
    return lines.join("\n");
}

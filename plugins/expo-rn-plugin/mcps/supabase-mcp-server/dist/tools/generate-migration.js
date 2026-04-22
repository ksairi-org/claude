"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMigration = generateMigration;
exports.formatMigrationResult = formatMigrationResult;
const promises_1 = require("fs/promises");
const path_1 = require("path");
function migrationTimestamp() {
    return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}
async function generateMigration(projectRoot, name, sql) {
    const migrationsDir = (0, path_1.join)(projectRoot, "supabase", "migrations");
    await (0, promises_1.mkdir)(migrationsDir, { recursive: true });
    const safeName = name.trim().replace(/\s+/g, "_").toLowerCase();
    const fileName = `${migrationTimestamp()}_${safeName}.sql`;
    const filePath = (0, path_1.join)(migrationsDir, fileName);
    const content = sql?.trim()
        ? sql.trim() + "\n"
        : `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n-- Add your SQL here\n`;
    await (0, promises_1.writeFile)(filePath, content, "utf-8");
    return { path: filePath, fileName, content };
}
function formatMigrationResult(result) {
    return [
        "## Migration created",
        `File: ${result.path}`,
        "",
        "```sql",
        result.content.trim(),
        "```",
    ].join("\n");
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTableSchema = getTableSchema;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const db_client_js_1 = require("./db-client.js");
function parseSchemaJson(raw, tableName) {
    const tableSchema = raw[tableName];
    if (!tableSchema) {
        throw new Error(`Table "${tableName}" not found in schema.json. Available: ${Object.keys(raw).join(", ")}`);
    }
    const columns = [];
    const enums = new Map();
    for (const [fieldName, typeSpec] of Object.entries(tableSchema)) {
        const nullable = typeSpec.endsWith("?");
        const baseType = nullable ? typeSpec.slice(0, -1) : typeSpec;
        if (baseType.startsWith("enum:")) {
            const values = baseType.slice(5).split(",").map((v) => v.trim());
            const udtName = `${tableName}_${fieldName}`;
            enums.set(udtName, values);
            columns.push({
                column_name: fieldName,
                data_type: "USER-DEFINED",
                udt_name: udtName,
                is_nullable: nullable ? "YES" : "NO",
                column_default: null,
            });
        }
        else {
            columns.push({
                column_name: fieldName,
                data_type: baseType,
                udt_name: baseType,
                is_nullable: nullable ? "YES" : "NO",
                column_default: null,
            });
        }
    }
    return { columns, enums };
}
// ─── Database schema introspection ───────────────────────────────────────────
function pgIdent(name) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid SQL identifier: "${name}"`);
    }
    return name;
}
async function getDatabaseSchema(tableName, schema) {
    const safeTable = pgIdent(tableName);
    const safeSchema = pgIdent(schema);
    const rawColumns = await (0, db_client_js_1.runSql)(`
    SELECT
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema = '${safeSchema}'
      AND c.table_name = '${safeTable}'
    ORDER BY c.ordinal_position
  `);
    if (rawColumns.length === 0) {
        throw new Error(`Table "${tableName}" not found in the ${schema} schema. Run get_tables to see available tables.`);
    }
    const columns = rawColumns.map((col) => ({
        column_name: col.column_name,
        data_type: col.data_type,
        udt_name: col.udt_name,
        is_nullable: col.is_nullable,
        column_default: col.column_default,
    }));
    const udtNames = [
        ...new Set(columns
            .filter((c) => c.data_type === "USER-DEFINED")
            .map((c) => c.udt_name)),
    ];
    const enums = new Map();
    if (udtNames.length > 0) {
        const quotedNames = udtNames.map((n) => `'${pgIdent(n)}'`).join(", ");
        const enumRows = await (0, db_client_js_1.runSql)(`
      SELECT
        t.typname AS enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = '${safeSchema}'
        AND t.typname IN (${quotedNames})
      GROUP BY t.typname
    `);
        for (const row of enumRows) {
            enums.set(row.enum_name, row.enum_values);
        }
    }
    return { columns, enums };
}
// ─── Public API ───────────────────────────────────────────────────────────────
async function getTableSchema(tableName, backend, databaseSchema, schemaPath, projectRoot) {
    if (backend === "supabase") {
        return getDatabaseSchema(tableName, databaseSchema);
    }
    if (!schemaPath) {
        throw new Error(`backend is "${backend}" but no schemaPath is configured in mcp.config.json.\n` +
            `Add "schemaPath": "schema.json" and create the file. See the README for the format.`);
    }
    const resolved = schemaPath.startsWith("/") ? schemaPath : (0, path_1.join)(projectRoot, schemaPath);
    const raw = JSON.parse(await (0, promises_1.readFile)(resolved, "utf-8"));
    return parseSchemaJson(raw, tableName);
}

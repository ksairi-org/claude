"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = getSchema;
exports.formatSchema = formatSchema;
const supabase_js_1 = require("../supabase.js");
async function getSchema() {
    const [tablesRows, viewsRows, funcsRows, enumsRows] = await Promise.all([
        (0, supabase_js_1.runSql)(`
      SELECT c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'api'
      ORDER BY c.table_name, c.ordinal_position
    `),
        (0, supabase_js_1.runSql)(`
      SELECT table_name AS view_name, view_definition AS definition
      FROM information_schema.views
      WHERE table_schema = 'api'
      ORDER BY table_name
    `),
        (0, supabase_js_1.runSql)(`
      SELECT DISTINCT r.routine_name AS function_name,
        r.data_type AS return_type,
        pg_get_function_arguments(p.oid) AS argument_types
      FROM information_schema.routines r
      JOIN pg_proc p ON p.proname = r.routine_name
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE r.routine_schema = 'api' AND n.nspname = 'api'
      ORDER BY r.routine_name
    `),
        (0, supabase_js_1.runSql)(`
      SELECT t.typname AS enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'api'
      GROUP BY t.typname
      ORDER BY t.typname
    `),
    ]);
    const tablesMap = {};
    for (const row of tablesRows) {
        const name = row.table_name;
        if (!tablesMap[name])
            tablesMap[name] = [];
        tablesMap[name].push({
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default,
        });
    }
    return {
        tables: Object.entries(tablesMap).map(([table_name, columns]) => ({ table_name, columns })),
        views: viewsRows.map((r) => ({
            view_name: r.view_name,
            definition: r.definition,
        })),
        functions: funcsRows.map((r) => ({
            function_name: r.function_name,
            return_type: r.return_type,
            argument_types: r.argument_types,
        })),
        enums: enumsRows.map((r) => ({
            enum_name: r.enum_name,
            values: r.values,
        })),
    };
}
function formatSchema(schema) {
    const lines = ["# Supabase Schema (api schema)"];
    lines.push(`\n## Tables (${schema.tables.length})`);
    for (const t of schema.tables) {
        lines.push(`\n### ${t.table_name}`);
        for (const c of t.columns) {
            const nullable = c.is_nullable === "YES" ? "?" : "";
            const def = c.column_default ? ` = ${c.column_default}` : "";
            lines.push(`  ${c.column_name}${nullable}: ${c.data_type}${def}`);
        }
    }
    if (schema.views.length > 0) {
        lines.push(`\n## Views (${schema.views.length})`);
        for (const v of schema.views) {
            lines.push(`\n### ${v.view_name}`, "```sql", v.definition?.trim() ?? "", "```");
        }
    }
    if (schema.functions.length > 0) {
        lines.push(`\n## Functions (${schema.functions.length})`);
        for (const f of schema.functions) {
            lines.push(`- \`${f.function_name}(${f.argument_types})\` → ${f.return_type}`);
        }
    }
    if (schema.enums.length > 0) {
        lines.push(`\n## Enums (${schema.enums.length})`);
        for (const e of schema.enums) {
            lines.push(`- \`${e.enum_name}\`: ${e.values.join(", ")}`);
        }
    }
    return lines.join("\n");
}

import { readFile } from "fs/promises";
import { join } from "path";
import { runSql } from "./supabase.js";
import type { BackendKind } from "./tools/load-config.js";

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
}

export interface TableSchema {
  columns: ColumnInfo[];
  enums: Map<string, string[]>;
}

// ─── schema.json format ───────────────────────────────────────────────────────
//
// {
//   "table_name": {
//     "field_name": "type"         -- NOT NULL
//     "other_field": "type?"       -- nullable (append ?)
//     "status": "enum:a,b,c"      -- enum with values
//     "status": "enum:a,b,c?"     -- nullable enum
//   }
// }
//
// Supported types: text, integer, number, boolean, uuid, date, json

type SchemaJson = Record<string, Record<string, string>>;

function parseSchemaJson(raw: SchemaJson, tableName: string): TableSchema {
  const tableSchema = raw[tableName];
  if (!tableSchema) {
    throw new Error(
      `Table "${tableName}" not found in schema.json. Available: ${Object.keys(raw).join(", ")}`,
    );
  }

  const columns: ColumnInfo[] = [];
  const enums = new Map<string, string[]>();

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
    } else {
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

// ─── Supabase schema introspection ────────────────────────────────────────────

function pgIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: "${name}"`);
  }
  return name;
}

async function getSupabaseSchema(tableName: string, schema: string): Promise<TableSchema> {
  const safeTable = pgIdent(tableName);
  const safeSchema = pgIdent(schema);
  const rawColumns = await runSql(`
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
    throw new Error(
      `Table "${tableName}" not found in the ${schema} schema. Run get_tables to see available tables.`,
    );
  }

  const columns = (rawColumns as Array<Record<string, unknown>>).map((col) => ({
    column_name: col.column_name as string,
    data_type: col.data_type as string,
    udt_name: col.udt_name as string,
    is_nullable: col.is_nullable as string,
    column_default: col.column_default as string | null,
  }));

  const udtNames = [
    ...new Set(
      columns
        .filter((c) => c.data_type === "USER-DEFINED")
        .map((c) => c.udt_name),
    ),
  ];

  const enums = new Map<string, string[]>();

  if (udtNames.length > 0) {
    const quotedNames = udtNames.map((n) => `'${pgIdent(n)}'`).join(", ");
    const enumRows = await runSql(`
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
    for (const row of enumRows as Array<Record<string, unknown>>) {
      enums.set(row.enum_name as string, row.enum_values as string[]);
    }
  }

  return { columns, enums };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getTableSchema(
  tableName: string,
  backend: BackendKind,
  supabaseSchema: string,
  schemaPath: string | undefined,
  projectRoot: string,
): Promise<TableSchema> {
  if (backend === "supabase") {
    return getSupabaseSchema(tableName, supabaseSchema);
  }

  if (!schemaPath) {
    throw new Error(
      `backend is "${backend}" but no schemaPath is configured in mcp.config.json.\n` +
        `Add "schemaPath": "schema.json" and create the file. See the README for the format.`,
    );
  }

  const resolved = schemaPath.startsWith("/") ? schemaPath : join(projectRoot, schemaPath);
  const raw = JSON.parse(await readFile(resolved, "utf-8")) as SchemaJson;
  return parseSchemaJson(raw, tableName);
}

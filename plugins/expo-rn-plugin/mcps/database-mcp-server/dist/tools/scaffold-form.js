"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaffoldForm = scaffoldForm;
exports.formatScaffoldResult = formatScaffoldResult;
const supabase_js_1 = require("../supabase.js");
// ─── Constants ────────────────────────────────────────────────────────────────
const AUTO_FIELDS = new Set([
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "inserted_at",
]);
// ─── Name helpers ─────────────────────────────────────────────────────────────
function toPascalCase(snake) {
    return snake
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}
function toCamelCase(snake) {
    const pascal = toPascalCase(snake);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
function toLabel(snake) {
    return snake
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
}
function resolveKind(dataType, udtName) {
    const t = dataType.toLowerCase();
    const u = udtName.toLowerCase();
    if (t === "uuid")
        return "uuid";
    if (t === "boolean")
        return "boolean";
    if (["integer", "int2", "int4", "int8", "smallint", "bigint"].includes(t) ||
        ["int2", "int4", "int8"].includes(u))
        return "integer";
    if ([
        "numeric",
        "decimal",
        "real",
        "double precision",
        "float4",
        "float8",
    ].includes(t))
        return "number";
    if ([
        "text",
        "character varying",
        "varchar",
        "char",
        "character",
        "citext",
        "name",
    ].includes(t))
        return "text";
    if ([
        "date",
        "timestamp",
        "timestamp with time zone",
        "timestamp without time zone",
        "timestamptz",
    ].includes(t))
        return "date";
    if (["json", "jsonb"].includes(t))
        return "json";
    if (t === "user-defined" || t === "array")
        return "enum";
    return "unknown";
}
function zodType(kind, col, enums) {
    const nullable = col.is_nullable === "YES";
    let base;
    if (kind === "uuid") {
        base = "z.string().uuid()";
    }
    else if (kind === "boolean") {
        base = "z.boolean()";
    }
    else if (kind === "integer") {
        base = "z.number().int()";
    }
    else if (kind === "number") {
        base = "z.number()";
    }
    else if (kind === "text") {
        base = "z.string()";
    }
    else if (kind === "date") {
        base = "z.coerce.date()";
    }
    else if (kind === "json") {
        base = "z.record(z.string(), z.unknown())";
    }
    else if (kind === "enum") {
        const values = enums.get(col.udt_name);
        if (values && values.length > 0) {
            const literals = values.map((v) => `"${v}"`).join(", ");
            base = `z.enum([${literals}])`;
        }
        else {
            base = "z.string()";
        }
    }
    else {
        base = "z.unknown()";
    }
    if (nullable) {
        base = `${base}.nullish()`;
    }
    return base;
}
// ─── Default value helper ─────────────────────────────────────────────────────
function defaultValue(kind, nullable) {
    if (nullable)
        return "undefined";
    if (kind === "boolean")
        return "false";
    if (kind === "integer" || kind === "number")
        return "0";
    if (kind === "date")
        return 'new Date()';
    if (kind === "json")
        return "{}";
    return '""';
}
// ─── Code generators ──────────────────────────────────────────────────────────
function generateSchemaCode(tableName, pascalName, columns, enums) {
    const fields = columns
        .map((col) => {
        const kind = resolveKind(col.data_type, col.udt_name);
        const zod = zodType(kind, col, enums);
        return `  ${col.column_name}: ${zod},`;
    })
        .join("\n");
    return [
        `import { z } from "zod";`,
        ``,
        `// Generated from Supabase \`api.${tableName}\` schema`,
        `export const ${toCamelCase(tableName)}Schema = z.object({`,
        fields,
        `});`,
        ``,
        `export type ${pascalName}FormValues = z.infer<typeof ${toCamelCase(tableName)}Schema>;`,
    ].join("\n");
}
function generateHookCode(tableName, pascalName, columns, enums) {
    const schemaVar = toCamelCase(tableName) + "Schema";
    const defaults = columns
        .map((col) => {
        const kind = resolveKind(col.data_type, col.udt_name);
        const nullable = col.is_nullable === "YES";
        let val = defaultValue(kind, nullable);
        // Use first enum value as default when not nullable
        if (kind === "enum" && !nullable) {
            const values = enums.get(col.udt_name);
            if (values && values.length > 0)
                val = `"${values[0]}"`;
        }
        return `      ${col.column_name}: ${val},`;
    })
        .join("\n");
    return [
        `import { useForm } from "react-hook-form";`,
        `import { zodResolver } from "@hookform/resolvers/zod";`,
        `import { ${schemaVar} } from "./${pascalName}Schema";`,
        `import type { ${pascalName}FormValues } from "./${pascalName}Schema";`,
        ``,
        `export function use${pascalName}Form(`,
        `  defaultValues?: Partial<${pascalName}FormValues>,`,
        `) {`,
        `  return useForm<${pascalName}FormValues>({`,
        `    resolver: zodResolver(${schemaVar}),`,
        `    defaultValues: {`,
        defaults,
        `      ...defaultValues,`,
        `    },`,
        `  });`,
        `}`,
    ].join("\n");
}
function generateComponentCode(tableName, pascalName, columns, enums) {
    const hookName = `use${pascalName}Form`;
    const formName = `${pascalName}Form`;
    const controllers = columns
        .map((col) => {
        const kind = resolveKind(col.data_type, col.udt_name);
        const label = toLabel(col.column_name);
        const nullable = col.is_nullable === "YES";
        if (kind === "boolean") {
            return [
                `      <Controller`,
                `        control={control}`,
                `        name="${col.column_name}"`,
                `        render={({ field: { onChange, value } }) => (`,
                `          <View style={styles.field}>`,
                `            <Text style={styles.label}>${label}</Text>`,
                `            <Switch`,
                `              value={value ?? false}`,
                `              onValueChange={onChange}`,
                `            />`,
                `            {errors.${col.column_name} && (`,
                `              <Text style={styles.error}>{errors.${col.column_name}?.message}</Text>`,
                `            )}`,
                `          </View>`,
                `        )}`,
                `      />`,
            ].join("\n");
        }
        if (kind === "enum") {
            const values = enums.get(col.udt_name);
            if (values && values.length > 0) {
                const options = values
                    .map((v) => `              <TouchableOpacity key="${v}" onPress={() => onChange("${v}")}>\n                <Text>{value === "${v}" ? "● " : "○ "}${v}</Text>\n              </TouchableOpacity>`)
                    .join("\n");
                return [
                    `      <Controller`,
                    `        control={control}`,
                    `        name="${col.column_name}"`,
                    `        render={({ field: { onChange, value } }) => (`,
                    `          <View style={styles.field}>`,
                    `            <Text style={styles.label}>${label}</Text>`,
                    `            <View style={styles.enumRow}>`,
                    options,
                    `            </View>`,
                    `            {errors.${col.column_name} && (`,
                    `              <Text style={styles.error}>{errors.${col.column_name}?.message}</Text>`,
                    `            )}`,
                    `          </View>`,
                    `        )}`,
                    `      />`,
                ].join("\n");
            }
        }
        const keyboardType = kind === "integer" || kind === "number" ? `keyboardType="numeric"` : "";
        const onChangeText = kind === "integer"
            ? `(text) => onChange(text === "" ? 0 : parseInt(text, 10))`
            : kind === "number"
                ? `(text) => onChange(text === "" ? 0 : parseFloat(text))`
                : `onChange`;
        const valueExpr = kind === "integer" || kind === "number"
            ? `value != null ? String(value) : ""`
            : `value ?? ""`;
        const optionalNote = nullable ? ` // optional` : "";
        return [
            `      <Controller`,
            `        control={control}`,
            `        name="${col.column_name}"`,
            `        render={({ field: { onChange, value } }) => (`,
            `          <View style={styles.field}>`,
            `            <Text style={styles.label}>${label}${optionalNote}</Text>`,
            `            <TextInput`,
            `              style={styles.input}`,
            `              value={${valueExpr}}`,
            `              onChangeText={${onChangeText}}`,
            keyboardType ? `              ${keyboardType}` : null,
            `            />`,
            `            {errors.${col.column_name} && (`,
            `              <Text style={styles.error}>{errors.${col.column_name}?.message}</Text>`,
            `            )}`,
            `          </View>`,
            `        )}`,
            `      />`,
        ]
            .filter((line) => line !== null)
            .join("\n");
    })
        .join("\n\n");
    return [
        `import React from "react";`,
        `import {`,
        `  View,`,
        `  Text,`,
        `  TextInput,`,
        `  Switch,`,
        `  TouchableOpacity,`,
        `  StyleSheet,`,
        `} from "react-native";`,
        `import { Controller } from "react-hook-form";`,
        `import { ${hookName} } from "./${hookName}";`,
        `import type { ${pascalName}FormValues } from "./${pascalName}Schema";`,
        ``,
        `interface ${formName}Props {`,
        `  onSubmit: (values: ${pascalName}FormValues) => void;`,
        `  defaultValues?: Partial<${pascalName}FormValues>;`,
        `}`,
        ``,
        `export function ${formName}({ onSubmit, defaultValues }: ${formName}Props) {`,
        `  const {`,
        `    control,`,
        `    handleSubmit,`,
        `    formState: { errors },`,
        `  } = ${hookName}(defaultValues);`,
        ``,
        `  return (`,
        `    <View style={styles.container}>`,
        controllers,
        ``,
        `      <TouchableOpacity style={styles.submit} onPress={handleSubmit(onSubmit)}>`,
        `        <Text style={styles.submitText}>Submit</Text>`,
        `      </TouchableOpacity>`,
        `    </View>`,
        `  );`,
        `}`,
        ``,
        `const styles = StyleSheet.create({`,
        `  container: { padding: 16, gap: 12 },`,
        `  field: { gap: 4 },`,
        `  label: { fontSize: 14, fontWeight: "600" },`,
        `  input: {`,
        `    borderWidth: 1,`,
        `    borderColor: "#ccc",`,
        `    borderRadius: 6,`,
        `    padding: 10,`,
        `    fontSize: 16,`,
        `  },`,
        `  enumRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },`,
        `  error: { color: "red", fontSize: 12 },`,
        `  submit: {`,
        `    backgroundColor: "#000",`,
        `    borderRadius: 8,`,
        `    paddingVertical: 14,`,
        `    alignItems: "center",`,
        `    marginTop: 8,`,
        `  },`,
        `  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },`,
        `});`,
    ].join("\n");
}
// ─── Main export ──────────────────────────────────────────────────────────────
async function scaffoldForm(options) {
    const { tableName, omitAutoFields = true } = options;
    const pascalName = toPascalCase(tableName);
    // 1. Fetch columns
    const rawColumns = await (0, supabase_js_1.runSql)(`
    SELECT
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema = 'api'
      AND c.table_name = '${tableName}'
    ORDER BY c.ordinal_position
  `);
    if (rawColumns.length === 0) {
        throw new Error(`Table "${tableName}" not found in the api schema. Run get_tables to see available tables.`);
    }
    let columns = rawColumns.map((col) => ({
        column_name: col.column_name,
        data_type: col.data_type,
        udt_name: col.udt_name,
        is_nullable: col.is_nullable,
        column_default: col.column_default,
    }));
    if (omitAutoFields) {
        columns = columns.filter((c) => !AUTO_FIELDS.has(c.column_name));
    }
    // 2. Fetch enum types used by this table
    const udtNames = [
        ...new Set(columns
            .filter((c) => c.data_type === "USER-DEFINED")
            .map((c) => c.udt_name)),
    ];
    const enums = new Map();
    if (udtNames.length > 0) {
        const quotedNames = udtNames.map((n) => `'${n}'`).join(", ");
        const enumRows = await (0, supabase_js_1.runSql)(`
      SELECT
        t.typname AS enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'api'
        AND t.typname IN (${quotedNames})
      GROUP BY t.typname
    `);
        for (const row of enumRows) {
            const name = row.enum_name;
            const values = row.enum_values;
            enums.set(name, values);
        }
    }
    // 3. Generate code
    const schemaCode = generateSchemaCode(tableName, pascalName, columns, enums);
    const hookCode = generateHookCode(tableName, pascalName, columns, enums);
    const componentCode = generateComponentCode(tableName, pascalName, columns, enums);
    return { tableName, pascalName, schemaCode, hookCode, componentCode };
}
function formatScaffoldResult(result) {
    const { tableName, pascalName, schemaCode, hookCode, componentCode } = result;
    return [
        `# Form Scaffold — \`${tableName}\``,
        ``,
        `> Generated for table \`api.${tableName}\`. Copy each file into your project.`,
        ``,
        `---`,
        ``,
        `## \`${pascalName}Schema.ts\``,
        ``,
        "```typescript",
        schemaCode,
        "```",
        ``,
        `---`,
        ``,
        `## \`use${pascalName}Form.ts\``,
        ``,
        "```typescript",
        hookCode,
        "```",
        ``,
        `---`,
        ``,
        `## \`${pascalName}Form.tsx\``,
        ``,
        "```typescript",
        componentCode,
        "```",
        ``,
        `---`,
        ``,
        `## Next steps`,
        ``,
        `1. Install deps if needed: \`npx expo install @hookform/resolvers react-hook-form zod\``,
        `2. Move files into \`src/screens/${pascalName}Screen/\` or your preferred screens folder`,
        `3. Style with your design tokens (replace the inline StyleSheet)`,
        `4. Wire \`onSubmit\` to a mutation: \`use${pascalName}Mutation\` from your react-query hooks`,
    ].join("\n");
}

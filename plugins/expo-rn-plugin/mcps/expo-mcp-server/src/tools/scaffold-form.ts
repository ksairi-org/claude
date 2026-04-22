import { getTableSchema } from "../schema-source.js";
import type { ColumnInfo } from "../schema-source.js";
import { loadConfig } from "./load-config.js";
import type { BackendKind } from "./load-config.js";

export interface ScaffoldFormOptions {
  tableName: string;
  projectRoot: string;
  /** Skip id / created_at / updated_at / deleted_at. Default: true */
  omitAutoFields?: boolean;
  /** Override the backend from mcp.config.json */
  backend?: BackendKind;
}

export interface ScaffoldFormResult {
  tableName: string;
  pascalName: string;
  schemaCode: string;
  hookCode: string;
  componentCode: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "inserted_at",
]);

// ─── Name helpers ─────────────────────────────────────────────────────────────

function toPascalCase(snake: string): string {
  return snake
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function toCamelCase(snake: string): string {
  const pascal = toPascalCase(snake);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toLabel(snake: string): string {
  return snake
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// ─── Type mapping ─────────────────────────────────────────────────────────────

type FieldKind =
  | "text"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "uuid"
  | "json"
  | "enum"
  | "unknown";

function resolveKind(dataType: string, udtName: string): FieldKind {
  const t = dataType.toLowerCase();
  const u = udtName.toLowerCase();

  if (t === "uuid") return "uuid";
  if (t === "boolean") return "boolean";
  if (
    ["integer", "int2", "int4", "int8", "smallint", "bigint"].includes(t) ||
    ["int2", "int4", "int8"].includes(u)
  )
    return "integer";
  if (
    [
      "numeric",
      "decimal",
      "real",
      "double precision",
      "float4",
      "float8",
    ].includes(t)
  )
    return "number";
  if (
    [
      "text",
      "character varying",
      "varchar",
      "char",
      "character",
      "citext",
      "name",
    ].includes(t)
  )
    return "text";
  if (
    [
      "date",
      "timestamp",
      "timestamp with time zone",
      "timestamp without time zone",
      "timestamptz",
    ].includes(t)
  )
    return "date";
  if (["json", "jsonb"].includes(t)) return "json";
  if (t === "user-defined" || t === "array") return "enum";
  return "unknown";
}

function zodType(
  kind: FieldKind,
  col: ColumnInfo,
  enums: Map<string, string[]>,
): string {
  const nullable = col.is_nullable === "YES";

  let base: string;

  if (kind === "uuid") {
    base = "z.string().uuid()";
  } else if (kind === "boolean") {
    base = "z.boolean()";
  } else if (kind === "integer") {
    base = "z.number().int()";
  } else if (kind === "number") {
    base = "z.number()";
  } else if (kind === "text") {
    base = "z.string()";
  } else if (kind === "date") {
    base = "z.coerce.date()";
  } else if (kind === "json") {
    base = "z.record(z.string(), z.unknown())";
  } else if (kind === "enum") {
    const values = enums.get(col.udt_name);
    if (values && values.length > 0) {
      const literals = values.map((v) => `"${v}"`).join(", ");
      base = `z.enum([${literals}])`;
    } else {
      base = "z.string()";
    }
  } else {
    base = "z.unknown()";
  }

  if (nullable) {
    base = `${base}.nullish()`;
  }

  return base;
}

// ─── Default value helper ─────────────────────────────────────────────────────

function defaultValue(kind: FieldKind, nullable: boolean): string {
  if (nullable) return "undefined";
  if (kind === "boolean") return "false";
  if (kind === "integer" || kind === "number") return "0";
  if (kind === "date") return 'new Date()';
  if (kind === "json") return "{}";
  return '""';
}

// ─── Code generators ──────────────────────────────────────────────────────────

function generateSchemaCode(
  tableName: string,
  pascalName: string,
  columns: ColumnInfo[],
  enums: Map<string, string[]>,
): string {
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
    `// Generated from \`${tableName}\` schema`,
    `export const ${toCamelCase(tableName)}Schema = z.object({`,
    fields,
    `});`,
    ``,
    `export type ${pascalName}FormValues = z.infer<typeof ${toCamelCase(tableName)}Schema>;`,
  ].join("\n");
}

function generateHookCode(
  tableName: string,
  pascalName: string,
  columns: ColumnInfo[],
  enums: Map<string, string[]>,
): string {
  const schemaVar = toCamelCase(tableName) + "Schema";

  const defaults = columns
    .map((col) => {
      const kind = resolveKind(col.data_type, col.udt_name);
      const nullable = col.is_nullable === "YES";
      let val = defaultValue(kind, nullable);

      // Use first enum value as default when not nullable
      if (kind === "enum" && !nullable) {
        const values = enums.get(col.udt_name);
        if (values && values.length > 0) val = `"${values[0]}"`;
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

function generateComponentCode(
  tableName: string,
  pascalName: string,
  columns: ColumnInfo[],
  enums: Map<string, string[]>,
): string {
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

      const keyboardType =
        kind === "integer" || kind === "number" ? `keyboardType="numeric"` : "";
      const onChangeText =
        kind === "integer"
          ? `(text) => onChange(text === "" ? 0 : parseInt(text, 10))`
          : kind === "number"
            ? `(text) => onChange(text === "" ? 0 : parseFloat(text))`
            : `onChange`;
      const valueExpr =
        kind === "integer" || kind === "number"
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

export async function scaffoldForm(
  options: ScaffoldFormOptions,
): Promise<ScaffoldFormResult> {
  const { tableName, projectRoot, omitAutoFields = true } = options;
  const pascalName = toPascalCase(tableName);
  const config = await loadConfig(projectRoot);
  const backend = options.backend ?? config.backend;

  const { columns: rawColumns, enums } = await getTableSchema(
    tableName,
    backend,
    config.supabase.schema ?? "public",
    config.schemaPath,
    projectRoot,
  );

  const columns = omitAutoFields
    ? rawColumns.filter((c) => !AUTO_FIELDS.has(c.column_name))
    : rawColumns;

  const schemaCode = generateSchemaCode(tableName, pascalName, columns, enums);
  const hookCode = generateHookCode(tableName, pascalName, columns, enums);
  const componentCode = generateComponentCode(tableName, pascalName, columns, enums);

  return { tableName, pascalName, schemaCode, hookCode, componentCode };
}

export function formatScaffoldResult(result: ScaffoldFormResult): string {
  const { tableName, pascalName, schemaCode, hookCode, componentCode } = result;

  return [
    `# Form Scaffold — \`${tableName}\``,
    ``,
    `> Generated for \`${tableName}\`. Copy each file into your project.`,
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

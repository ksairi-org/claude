import { runSql } from "../supabase.js";
import { loadConfig } from "./load-config.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
}

export interface ScaffoldCrudOptions {
  tableName: string;
  projectRoot: string;
  /** Skip id / created_at / updated_at / deleted_at in write types. Default: true */
  omitAutoFields?: boolean;
  /**
   * Generate form-based detail and create screens that import the {Pascal}Form
   * produced by scaffold_form. Default: false — detail screen is read-only,
   * no create screen is generated.
   */
  includeForm?: boolean;
}

interface RouteFile {
  path: string;
  code: string;
}

export interface ScaffoldCrudResult {
  tableName: string;
  pascalName: string;
  screensDir: string;
  routesDir: string;
  includeForm: boolean;
  typesCode: string;
  hooksCode: string;
  listScreenCode: string;
  detailScreenCode: string;
  createScreenCode: string | null;
  routeFiles: RouteFile[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "inserted_at",
]);

const DISPLAY_FIELD_CANDIDATES = [
  "name",
  "title",
  "label",
  "description",
  "email",
  "slug",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    ["numeric", "decimal", "real", "double precision", "float4", "float8"].includes(t)
  )
    return "number";
  if (
    ["text", "character varying", "varchar", "char", "character", "citext", "name"].includes(t)
  )
    return "text";
  if (
    ["date", "timestamp", "timestamp with time zone", "timestamp without time zone", "timestamptz"].includes(t)
  )
    return "date";
  if (["json", "jsonb"].includes(t)) return "json";
  if (t === "user-defined" || t === "array") return "enum";
  return "unknown";
}

function tsType(
  kind: FieldKind,
  udtName: string,
  isNullable: boolean,
  enums: Map<string, string[]>,
): string {
  let base: string;
  if (kind === "uuid" || kind === "text") base = "string";
  else if (kind === "boolean") base = "boolean";
  else if (kind === "integer" || kind === "number") base = "number";
  else if (kind === "date") base = "string"; // ISO string from Supabase
  else if (kind === "json") base = "Record<string, unknown>";
  else if (kind === "enum") {
    const values = enums.get(udtName);
    base =
      values && values.length > 0
        ? values.map((v) => `"${v}"`).join(" | ")
        : "string";
  } else base = "unknown";
  return isNullable ? `${base} | null` : base;
}

function findDisplayField(columns: ColumnInfo[]): string {
  for (const candidate of DISPLAY_FIELD_CANDIDATES) {
    if (columns.some((c) => c.column_name === candidate)) return candidate;
  }
  const firstText = columns.find((c) => {
    const kind = resolveKind(c.data_type, c.udt_name);
    return kind === "text" && c.column_name !== "id";
  });
  return firstText?.column_name ?? "id";
}

// ─── Code generators ──────────────────────────────────────────────────────────

function generateTypesCode(
  tableName: string,
  pascalName: string,
  allColumns: ColumnInfo[],
  writeColumns: ColumnInfo[],
  enums: Map<string, string[]>,
): string {
  const rowFields = allColumns
    .map((col) => {
      const kind = resolveKind(col.data_type, col.udt_name);
      const nullable = col.is_nullable === "YES";
      return `  ${col.column_name}: ${tsType(kind, col.udt_name, nullable, enums)};`;
    })
    .join("\n");

  const createFields = writeColumns
    .map((col) => {
      const kind = resolveKind(col.data_type, col.udt_name);
      const nullable = col.is_nullable === "YES";
      const optional = nullable ? "?" : "";
      return `  ${col.column_name}${optional}: ${tsType(kind, col.udt_name, false, enums)};`;
    })
    .join("\n");

  return [
    `// Generated from Supabase \`api.${tableName}\``,
    ``,
    `export interface ${pascalName}Row {`,
    rowFields,
    `}`,
    ``,
    `/** Input for INSERT — auto-managed fields omitted, nullable fields optional */`,
    `export type Create${pascalName}Input = {`,
    createFields,
    `};`,
    ``,
    `/** Input for UPDATE — all fields optional */`,
    `export type Update${pascalName}Input = Partial<Create${pascalName}Input>;`,
  ].join("\n");
}

function generateHooksCode(
  tableName: string,
  pascalName: string,
): string {
  const queryKeyConst = `${toCamelCase(tableName).toUpperCase()}_QUERY_KEY`;

  return [
    `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";`,
    `import { supabase } from "@react-auth-client";`,
    `import type { ${pascalName}Row, Create${pascalName}Input, Update${pascalName}Input } from "./${pascalName}Types";`,
    ``,
    `const ${queryKeyConst} = ["${tableName}"] as const;`,
    ``,
    `export function useList${pascalName}() {`,
    `  return useQuery({`,
    `    queryKey: ${queryKeyConst},`,
    `    queryFn: async () => {`,
    `      const { data, error } = await supabase.from("${tableName}").select("*");`,
    `      if (error) throw error;`,
    `      return data as ${pascalName}Row[];`,
    `    },`,
    `  });`,
    `}`,
    ``,
    `export function useGet${pascalName}(id: string) {`,
    `  return useQuery({`,
    `    queryKey: [...${queryKeyConst}, id],`,
    `    queryFn: async () => {`,
    `      const { data, error } = await supabase`,
    `        .from("${tableName}")`,
    `        .select("*")`,
    `        .eq("id", id)`,
    `        .single();`,
    `      if (error) throw error;`,
    `      return data as ${pascalName}Row;`,
    `    },`,
    `    enabled: !!id,`,
    `  });`,
    `}`,
    ``,
    `export function useCreate${pascalName}() {`,
    `  const qc = useQueryClient();`,
    `  return useMutation({`,
    `    mutationFn: async (input: Create${pascalName}Input) => {`,
    `      const { data, error } = await supabase`,
    `        .from("${tableName}")`,
    `        .insert(input)`,
    `        .select()`,
    `        .single();`,
    `      if (error) throw error;`,
    `      return data as ${pascalName}Row;`,
    `    },`,
    `    onSuccess: () => qc.invalidateQueries({ queryKey: ${queryKeyConst} }),`,
    `  });`,
    `}`,
    ``,
    `export function useUpdate${pascalName}(id: string) {`,
    `  const qc = useQueryClient();`,
    `  return useMutation({`,
    `    mutationFn: async (input: Update${pascalName}Input) => {`,
    `      const { data, error } = await supabase`,
    `        .from("${tableName}")`,
    `        .update(input)`,
    `        .eq("id", id)`,
    `        .select()`,
    `        .single();`,
    `      if (error) throw error;`,
    `      return data as ${pascalName}Row;`,
    `    },`,
    `    onSuccess: () => {`,
    `      qc.invalidateQueries({ queryKey: ${queryKeyConst} });`,
    `      qc.invalidateQueries({ queryKey: [...${queryKeyConst}, id] });`,
    `    },`,
    `  });`,
    `}`,
    ``,
    `export function useDelete${pascalName}() {`,
    `  const qc = useQueryClient();`,
    `  return useMutation({`,
    `    mutationFn: async (id: string) => {`,
    `      const { error } = await supabase.from("${tableName}").delete().eq("id", id);`,
    `      if (error) throw error;`,
    `    },`,
    `    onSuccess: () => qc.invalidateQueries({ queryKey: ${queryKeyConst} }),`,
    `  });`,
    `}`,
  ].join("\n");
}

function generateListScreenCode(
  tableName: string,
  pascalName: string,
  displayField: string,
): string {
  return [
    `import React from "react";`,
    `import {`,
    `  FlatList,`,
    `  View,`,
    `  Text,`,
    `  TouchableOpacity,`,
    `  StyleSheet,`,
    `  ActivityIndicator,`,
    `} from "react-native";`,
    `import { router } from "expo-router";`,
    `import { useList${pascalName} } from "./${pascalName}Hooks";`,
    ``,
    `export function ${pascalName}ListScreen() {`,
    `  const { data, isLoading, isError } = useList${pascalName}();`,
    ``,
    `  if (isLoading) return <ActivityIndicator style={styles.center} />;`,
    `  if (isError) return <Text style={styles.errorText}>Failed to load</Text>;`,
    ``,
    `  return (`,
    `    <View style={styles.container}>`,
    `      <FlatList`,
    `        data={data ?? []}`,
    `        keyExtractor={(item) => item.id}`,
    `        renderItem={({ item }) => (`,
    `          <TouchableOpacity`,
    `            style={styles.item}`,
    `            onPress={() => router.push(\`/${tableName}/\${item.id}\` as never)}`,
    `          >`,
    `            <Text style={styles.itemText}>{item.${displayField}}</Text>`,
    `          </TouchableOpacity>`,
    `        )}`,
    `        ListEmptyComponent={`,
    `          <Text style={styles.empty}>No ${tableName.replace(/_/g, " ")} found</Text>`,
    `        }`,
    `      />`,
    `      <TouchableOpacity`,
    `        style={styles.fab}`,
    `        onPress={() => router.push("/${tableName}/new" as never)}`,
    `      >`,
    `        <Text style={styles.fabText}>+</Text>`,
    `      </TouchableOpacity>`,
    `    </View>`,
    `  );`,
    `}`,
    ``,
    `const styles = StyleSheet.create({`,
    `  container: { flex: 1 },`,
    `  center: { flex: 1, alignSelf: "center" },`,
    `  item: {`,
    `    padding: 16,`,
    `    borderBottomWidth: 1,`,
    `    borderBottomColor: "#eee",`,
    `  },`,
    `  itemText: { fontSize: 16 },`,
    `  empty: { textAlign: "center", marginTop: 48, color: "#999" },`,
    `  errorText: { color: "red", textAlign: "center", marginTop: 48 },`,
    `  fab: {`,
    `    position: "absolute",`,
    `    bottom: 24,`,
    `    right: 24,`,
    `    width: 56,`,
    `    height: 56,`,
    `    borderRadius: 28,`,
    `    backgroundColor: "#000",`,
    `    alignItems: "center",`,
    `    justifyContent: "center",`,
    `  },`,
    `  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },`,
    `});`,
  ].join("\n");
}

function generateDetailScreenCode(
  tableName: string,
  pascalName: string,
  includeForm: boolean,
): string {
  if (includeForm) {
    return [
      `import React from "react";`,
      `import {`,
      `  View,`,
      `  Text,`,
      `  TouchableOpacity,`,
      `  StyleSheet,`,
      `  Alert,`,
      `  ActivityIndicator,`,
      `  ScrollView,`,
      `} from "react-native";`,
      `import { router, useLocalSearchParams } from "expo-router";`,
      `import { useGet${pascalName}, useUpdate${pascalName}, useDelete${pascalName} } from "./${pascalName}Hooks";`,
      `import { ${pascalName}Form } from "./${pascalName}Form";`,
      `import type { ${pascalName}FormValues } from "./${pascalName}Schema";`,
      ``,
      `export function ${pascalName}DetailScreen() {`,
      `  const { id } = useLocalSearchParams<{ id: string }>();`,
      `  const { data, isLoading } = useGet${pascalName}(id);`,
      `  const update = useUpdate${pascalName}(id);`,
      `  const remove = useDelete${pascalName}();`,
      ``,
      `  if (isLoading || !data) return <ActivityIndicator style={styles.center} />;`,
      ``,
      `  const handleSubmit = async (values: ${pascalName}FormValues) => {`,
      `    await update.mutateAsync(values);`,
      `    router.back();`,
      `  };`,
      ``,
      `  const handleDelete = () =>`,
      `    Alert.alert("Delete", "Are you sure?", [`,
      `      { text: "Cancel", style: "cancel" },`,
      `      {`,
      `        text: "Delete",`,
      `        style: "destructive",`,
      `        onPress: async () => {`,
      `          await remove.mutateAsync(id);`,
      `          router.back();`,
      `        },`,
      `      },`,
      `    ]);`,
      ``,
      `  return (`,
      `    <ScrollView contentContainerStyle={styles.container}>`,
      `      <${pascalName}Form onSubmit={handleSubmit} defaultValues={data} />`,
      `      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>`,
      `        <Text style={styles.deleteText}>Delete</Text>`,
      `      </TouchableOpacity>`,
      `    </ScrollView>`,
      `  );`,
      `}`,
      ``,
      `const styles = StyleSheet.create({`,
      `  container: { padding: 16, gap: 16 },`,
      `  center: { flex: 1, alignSelf: "center" },`,
      `  deleteBtn: {`,
      `    borderRadius: 8,`,
      `    borderWidth: 1,`,
      `    borderColor: "#e00",`,
      `    paddingVertical: 14,`,
      `    alignItems: "center",`,
      `  },`,
      `  deleteText: { color: "#e00", fontWeight: "600" },`,
      `});`,
    ].join("\n");
  }

  // Read-only view — no form dependency
  return [
    `import React from "react";`,
    `import {`,
    `  View,`,
    `  Text,`,
    `  TouchableOpacity,`,
    `  StyleSheet,`,
    `  Alert,`,
    `  ActivityIndicator,`,
    `  ScrollView,`,
    `} from "react-native";`,
    `import { router, useLocalSearchParams } from "expo-router";`,
    `import { useGet${pascalName}, useDelete${pascalName} } from "./${pascalName}Hooks";`,
    `import type { ${pascalName}Row } from "./${pascalName}Types";`,
    ``,
    `export function ${pascalName}DetailScreen() {`,
    `  const { id } = useLocalSearchParams<{ id: string }>();`,
    `  const { data, isLoading } = useGet${pascalName}(id);`,
    `  const remove = useDelete${pascalName}();`,
    ``,
    `  if (isLoading || !data) return <ActivityIndicator style={styles.center} />;`,
    ``,
    `  const handleDelete = () =>`,
    `    Alert.alert("Delete", "Are you sure?", [`,
    `      { text: "Cancel", style: "cancel" },`,
    `      {`,
    `        text: "Delete",`,
    `        style: "destructive",`,
    `        onPress: async () => {`,
    `          await remove.mutateAsync(id);`,
    `          router.back();`,
    `        },`,
    `      },`,
    `    ]);`,
    ``,
    `  return (`,
    `    <ScrollView contentContainerStyle={styles.container}>`,
    `      {/* Read-only field display — replace fields or add edit actions as needed */}`,
    `      {(Object.keys(data) as Array<keyof ${pascalName}Row>).map((key) => (`,
    `        <View key={key as string} style={styles.field}>`,
    `          <Text style={styles.label}>{key as string}</Text>`,
    `          <Text style={styles.value}>{String(data[key] ?? "—")}</Text>`,
    `        </View>`,
    `      ))}`,
    `      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>`,
    `        <Text style={styles.deleteText}>Delete</Text>`,
    `      </TouchableOpacity>`,
    `    </ScrollView>`,
    `  );`,
    `}`,
    ``,
    `const styles = StyleSheet.create({`,
    `  container: { padding: 16, gap: 12 },`,
    `  center: { flex: 1, alignSelf: "center" },`,
    `  field: { gap: 2 },`,
    `  label: { fontSize: 12, color: "#999", fontWeight: "600", textTransform: "uppercase" },`,
    `  value: { fontSize: 16 },`,
    `  deleteBtn: {`,
    `    borderRadius: 8,`,
    `    borderWidth: 1,`,
    `    borderColor: "#e00",`,
    `    paddingVertical: 14,`,
    `    alignItems: "center",`,
    `    marginTop: 8,`,
    `  },`,
    `  deleteText: { color: "#e00", fontWeight: "600" },`,
    `});`,
  ].join("\n");
}

function generateCreateScreenCode(
  tableName: string,
  pascalName: string,
): string {
  return [
    `import React from "react";`,
    `import { ScrollView } from "react-native";`,
    `import { router } from "expo-router";`,
    `import { useCreate${pascalName} } from "./${pascalName}Hooks";`,
    `import { ${pascalName}Form } from "./${pascalName}Form";`,
    `import type { ${pascalName}FormValues } from "./${pascalName}Schema";`,
    ``,
    `export function ${pascalName}CreateScreen() {`,
    `  const create = useCreate${pascalName}();`,
    ``,
    `  const handleSubmit = async (values: ${pascalName}FormValues) => {`,
    `    await create.mutateAsync(values);`,
    `    router.back();`,
    `  };`,
    ``,
    `  return (`,
    `    <ScrollView contentContainerStyle={{ padding: 16 }}>`,
    `      <${pascalName}Form onSubmit={handleSubmit} />`,
    `    </ScrollView>`,
    `  );`,
    `}`,
  ].join("\n");
}

function generateRouteFiles(
  tableName: string,
  pascalName: string,
  routesDir: string,
  includeForm: boolean,
): RouteFile[] {
  const base = `${routesDir}/(app)/${tableName}`;
  const screens = `@screens`;

  const files: RouteFile[] = [
    {
      path: `${base}/index.tsx`,
      code: [
        `import { ${pascalName}ListScreen } from "${screens}";`,
        ``,
        `export default ${pascalName}ListScreen;`,
      ].join("\n"),
    },
    {
      path: `${base}/[id].tsx`,
      code: [
        `import { ${pascalName}DetailScreen } from "${screens}";`,
        ``,
        `export default ${pascalName}DetailScreen;`,
      ].join("\n"),
    },
  ];

  if (includeForm) {
    files.push({
      path: `${base}/new.tsx`,
      code: [
        `import { ${pascalName}CreateScreen } from "${screens}";`,
        ``,
        `export default ${pascalName}CreateScreen;`,
      ].join("\n"),
    });
  }

  return files;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scaffoldCrud(
  options: ScaffoldCrudOptions,
): Promise<ScaffoldCrudResult> {
  const { tableName, projectRoot, omitAutoFields = true, includeForm = false } = options;
  const pascalName = toPascalCase(tableName);
  const config = await loadConfig(projectRoot);
  const screensDir = config.components.screens ?? "src/screens";
  const routesDir = config.routesDir;

  // 1. Fetch all columns
  const rawColumns = await runSql(`
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
    throw new Error(
      `Table "${tableName}" not found in the api schema. Run get_tables to see available tables.`,
    );
  }

  const allColumns = (rawColumns as Array<Record<string, unknown>>).map(
    (col) => ({
      column_name: col.column_name as string,
      data_type: col.data_type as string,
      udt_name: col.udt_name as string,
      is_nullable: col.is_nullable as string,
      column_default: col.column_default as string | null,
    }),
  );

  const writeColumns = omitAutoFields
    ? allColumns.filter((c) => !AUTO_FIELDS.has(c.column_name))
    : allColumns;

  // 2. Fetch enum types
  const udtNames = [
    ...new Set(
      allColumns
        .filter((c) => c.data_type === "USER-DEFINED")
        .map((c) => c.udt_name),
    ),
  ];

  const enums = new Map<string, string[]>();

  if (udtNames.length > 0) {
    const quotedNames = udtNames.map((n) => `'${n}'`).join(", ");
    const enumRows = await runSql(`
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
    for (const row of enumRows as Array<Record<string, unknown>>) {
      enums.set(row.enum_name as string, row.enum_values as string[]);
    }
  }

  // 3. Generate code
  const displayField = findDisplayField(allColumns);

  return {
    tableName,
    pascalName,
    screensDir,
    routesDir,
    includeForm,
    typesCode: generateTypesCode(tableName, pascalName, allColumns, writeColumns, enums),
    hooksCode: generateHooksCode(tableName, pascalName),
    listScreenCode: generateListScreenCode(tableName, pascalName, displayField),
    detailScreenCode: generateDetailScreenCode(tableName, pascalName, includeForm),
    createScreenCode: includeForm ? generateCreateScreenCode(tableName, pascalName) : null,
    routeFiles: generateRouteFiles(tableName, pascalName, routesDir, includeForm),
  };
}

export function formatScaffoldCrudResult(result: ScaffoldCrudResult): string {
  const {
    tableName,
    pascalName,
    screensDir,
    includeForm,
    typesCode,
    hooksCode,
    listScreenCode,
    detailScreenCode,
    createScreenCode,
    routeFiles,
  } = result;

  const screenPath = `${screensDir}/${pascalName}Screen`;

  const routeBlocks = routeFiles
    .map((f) =>
      [
        `### \`${f.path}\``,
        ``,
        "```typescript",
        f.code,
        "```",
      ].join("\n"),
    )
    .join("\n\n");

  const createSection =
    createScreenCode !== null
      ? [
          `---`,
          ``,
          `## \`${pascalName}CreateScreen.tsx\``,
          ``,
          "```typescript",
          createScreenCode,
          "```",
          ``,
        ].join("\n")
      : "";

  const nextSteps = includeForm
    ? [
        `1. Run \`scaffold_form\` for \`${tableName}\` to generate \`${pascalName}Schema.ts\`, \`use${pascalName}Form.ts\`, and \`${pascalName}Form.tsx\``,
        `2. Place all files in \`${screenPath}/\``,
        `3. Export screens from \`${screensDir}/index.ts\``,
        `4. Add route files at the paths listed above`,
        `5. The hooks use \`@react-auth-client\` for the Supabase client — verify this alias matches your project`,
      ]
    : [
        `1. Place all files in \`${screenPath}/\``,
        `2. Export screens from \`${screensDir}/index.ts\``,
        `3. Add route files at the paths listed above`,
        `4. The hooks use \`@react-auth-client\` for the Supabase client — verify this alias matches your project`,
        `5. The detail screen is read-only. To add editing, run \`scaffold_form\` and set \`includeForm: true\` on this tool, or wire in your own edit UI`,
      ];

  return [
    `# CRUD Scaffold — \`${tableName}\``,
    ``,
    `> Generated for table \`api.${tableName}\`. Copy files into \`${screenPath}/\`.`,
    ``,
    `---`,
    ``,
    `## \`${pascalName}Types.ts\``,
    ``,
    "```typescript",
    typesCode,
    "```",
    ``,
    `---`,
    ``,
    `## \`${pascalName}Hooks.ts\``,
    ``,
    "```typescript",
    hooksCode,
    "```",
    ``,
    `---`,
    ``,
    `## \`${pascalName}ListScreen.tsx\``,
    ``,
    "```typescript",
    listScreenCode,
    "```",
    ``,
    `---`,
    ``,
    `## \`${pascalName}DetailScreen.tsx\``,
    ``,
    "```typescript",
    detailScreenCode,
    "```",
    ``,
    createSection,
    `## Route files`,
    ``,
    routeBlocks,
    ``,
    `---`,
    ``,
    `## Next steps`,
    ``,
    ...nextSteps,
  ].join("\n");
}

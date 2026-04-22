import { readFile } from "fs/promises";
import { join } from "path";

export interface I18nConfig {
  localesDir: string;
  sourceLocale: string;
  targetLocales: string[];
  sourceGlobs: string[];
  catalogFormat?: "po" | "json";
}

export interface FirebaseConfig {
  serviceAccountPath?: string;
  deviceTokensTable?: string;
}

export interface OrvalConfig {
  sdkLib: string;
}

export type BackendKind = "supabase" | "firebase" | "rest";

export interface DopplerConfig {
  project: string;
  config?: string;
}

export interface McpConfig {
  doppler?: DopplerConfig;
  backend?: BackendKind;
  /** Path to schema.json (relative to project root or absolute). Required when backend is "firebase" or "rest". */
  schemaPath?: string;
  database?: {
    schema?: string;
  };
  components?: {
    atoms?: string;
    molecules?: string;
    organisms?: string;
    screens?: string;
    [key: string]: string | undefined; // allow extra categories
  };
  libs?: string[];
  router?: "expo-router" | "react-navigation";
  routesDir?: string;
  i18n?: I18nConfig;
  firebase?: FirebaseConfig;
  orval?: OrvalConfig;
}

// All fields resolved to defaults except i18n, firebase, orval, doppler, and schemaPath, which remain optional
export type ResolvedMcpConfig = Omit<Required<McpConfig>, "i18n" | "firebase" | "orval" | "schemaPath" | "doppler"> & {
  schemaPath?: string;
  doppler?: DopplerConfig;
  i18n?: I18nConfig;
  firebase?: FirebaseConfig;
  orval?: OrvalConfig;
};

const DEFAULTS: ResolvedMcpConfig = {
  backend: "supabase",
  database: {
    schema: "public",
  },
  components: {
    atoms: "src/components/atoms",
    molecules: "src/components/molecules",
    organisms: "src/components/organisms",
    screens: "src/screens",
  },
  libs: [],
  router: "expo-router",
  routesDir: "src/app",
};

export async function loadConfig(
  projectRoot: string,
): Promise<ResolvedMcpConfig> {
  const configPath = join(projectRoot, "mcp.config.json");

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed: McpConfig = JSON.parse(raw);

    // Deep merge with defaults
    return {
      backend: parsed.backend ?? DEFAULTS.backend,
      schemaPath: parsed.schemaPath,
      database: { ...DEFAULTS.database, ...parsed.database },
      components: { ...DEFAULTS.components, ...parsed.components },
      libs: parsed.libs ?? DEFAULTS.libs,
      router: parsed.router ?? DEFAULTS.router,
      routesDir: parsed.routesDir ?? DEFAULTS.routesDir,
      i18n: parsed.i18n,
      firebase: parsed.firebase,
      orval: parsed.orval,
    };
  } catch {
    // No config file found — use defaults silently
    return DEFAULTS;
  }
}

export function configSummary(config: ResolvedMcpConfig): string {
  const lines = [
    "# MCP Config",
    `Backend: ${config.backend}`,
    ...(config.backend === "supabase" ? [`Database schema: ${config.database.schema}`] : []),
    ...(config.schemaPath ? [`Schema path: ${config.schemaPath}`] : []),
    `Router: ${config.router}`,
    `Routes dir: ${config.routesDir}`,
    "",
    "Component paths:",
    ...Object.entries(config.components).map(([k, v]) => `  ${k}: ${v}`),
  ];

  if (config.libs.length > 0) {
    lines.push("", "Libs scanned:");
    lines.push(...config.libs.map((l) => `  ${l}`));
  } else {
    lines.push("", "Libs: none configured");
  }

  if (config.i18n) {
    const { localesDir, sourceLocale, targetLocales, catalogFormat } = config.i18n;
    lines.push(
      "",
      "i18n (Lingui):",
      `  Locales dir: ${localesDir}`,
      `  Source locale: ${sourceLocale}`,
      `  Target locales: ${targetLocales.join(", ")}`,
      `  Format: ${catalogFormat ?? "po"}`,
      "",
      "i18n conventions (always apply when generating screens or components):",
      "  - Import the `t` macro and `Trans` component from `@lingui/macro`",
      "  - Wrap all user-facing strings with `t\\`...\\`` (for expressions) or `<Trans>...</Trans>` (for JSX)",
      "  - Never hardcode raw string literals in JSX or as prop values meant for display",
    );
  }

  return lines.join("\n");
}

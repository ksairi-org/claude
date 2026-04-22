import { readFile, writeFile, access } from "fs/promises";
import { join } from "path";
import { glob } from "glob";

interface InitOptions {
  projectRoot: string;
  backend?: "supabase" | "firebase" | "rest";
  databaseSchema?: string;
  schemaPath?: string;
  sourceLocale?: string;
  targetLocales?: string[];
  overwrite?: boolean;
}

interface InitResult {
  created: boolean;
  skipped: boolean;
  path: string;
  config: object;
  warnings: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function detectRouter(projectRoot: string): Promise<{ router: "expo-router" | "react-navigation"; routesDir: string }> {
  const appDir = join(projectRoot, "src", "app");
  const pagesDir = join(projectRoot, "app");

  if (await exists(appDir)) return { router: "expo-router", routesDir: "src/app" };
  if (await exists(pagesDir)) return { router: "expo-router", routesDir: "app" };
  return { router: "react-navigation", routesDir: "src/app" };
}

async function detectComponents(projectRoot: string): Promise<Record<string, string>> {
  const candidates = {
    atoms: ["src/components/atoms", "src/ui/atoms", "src/components/ui"],
    molecules: ["src/components/molecules", "src/ui/molecules"],
    organisms: ["src/components/organisms", "src/ui/organisms"],
    screens: ["src/screens", "src/views", "src/pages"],
  };

  const resolved: Record<string, string> = {};

  for (const [key, paths] of Object.entries(candidates)) {
    for (const p of paths) {
      if (await exists(join(projectRoot, p))) {
        resolved[key] = p;
        break;
      }
    }
    if (!resolved[key]) {
      resolved[key] = candidates[key as keyof typeof candidates][0];
    }
  }

  return resolved;
}

async function detectLibs(projectRoot: string): Promise<string[]> {
  const libsDir = join(projectRoot, "libs");
  if (!(await exists(libsDir))) return [];

  const dirs = await glob("libs/*/", { cwd: projectRoot });
  return dirs.map((d) => d.replace(/\/$/, ""));
}

async function detectI18n(projectRoot: string): Promise<object | undefined> {
  const candidates = ["src/i18n/locales", "src/locales", "locales"];
  for (const dir of candidates) {
    if (await exists(join(projectRoot, dir))) {
      return {
        localesDir: dir,
        sourceLocale: "en",
        targetLocales: ["es"],
        sourceGlobs: ["src/**/*.{ts,tsx}"],
        catalogFormat: "po",
      };
    }
  }
  return undefined;
}

async function detectOrval(projectRoot: string): Promise<object | undefined> {
  const candidates = ["libs/react-query-sdk", "src/api", "src/sdk"];
  for (const dir of candidates) {
    if (await exists(join(projectRoot, dir))) {
      return { sdkLib: dir };
    }
  }
  return undefined;
}

export async function initProjectConfig(options: InitOptions): Promise<InitResult> {
  const {
    projectRoot,
    backend = "supabase",
    databaseSchema = "api",
    schemaPath,
    sourceLocale = "en",
    targetLocales = ["es"],
    overwrite = false,
  } = options;
  const configPath = join(projectRoot, "mcp.config.json");
  const warnings: string[] = [];

  if (!overwrite && (await exists(configPath))) {
    const existing = JSON.parse(await readFile(configPath, "utf-8"));
    return { created: false, skipped: true, path: configPath, config: existing, warnings };
  }

  const [{ router, routesDir }, components, libs, i18n, orval] = await Promise.all([
    detectRouter(projectRoot),
    detectComponents(projectRoot),
    detectLibs(projectRoot),
    detectI18n(projectRoot),
    detectOrval(projectRoot),
  ]);

  if (!i18n) warnings.push("No i18n locales directory detected — add the i18n section manually if you use Lingui.");
  if (!orval) warnings.push("No orval SDK directory detected — add the orval section manually if you use orval.");
  if (backend !== "supabase" && !schemaPath) {
    warnings.push(
      `backend is "${backend}" but no schemaPath was provided. Add "schemaPath": "schema.json" to mcp.config.json and create the file.`,
    );
  }

  const config: Record<string, unknown> = { backend, components, libs, router, routesDir };

  if (backend === "supabase") {
    config.database = { schema: databaseSchema };
  }
  if (schemaPath) {
    config.schemaPath = schemaPath;
  }
  if (orval) config.orval = orval;
  if (i18n) {
    config.i18n = { ...(i18n as object), sourceLocale, targetLocales };
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  return { created: true, skipped: false, path: configPath, config, warnings };
}

export function formatInitResult(result: InitResult): string {
  if (result.skipped) {
    return [
      `## mcp.config.json already exists`,
      `Path: ${result.path}`,
      ``,
      `Use \`overwrite: true\` to replace it.`,
      ``,
      `Current config:`,
      "```json",
      JSON.stringify(result.config, null, 2),
      "```",
    ].join("\n");
  }

  const lines = [
    `## mcp.config.json created`,
    `Path: ${result.path}`,
    ``,
    "```json",
    JSON.stringify(result.config, null, 2),
    "```",
  ];

  if (result.warnings.length > 0) {
    lines.push("", "**Warnings:**");
    result.warnings.forEach((w) => lines.push(`- ${w}`));
  }

  return lines.join("\n");
}

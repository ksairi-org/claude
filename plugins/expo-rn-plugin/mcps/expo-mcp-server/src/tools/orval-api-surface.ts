import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { loadConfig } from "./load-config.js";

interface ApiFile {
  name: string;
  relativePath: string;
  exports: string[];
}

const CANDIDATE_DIRS = [
  "libs/react-query-sdk",
  "src/api",
  "src/sdk",
  "src/generated",
];

async function findSdkDir(projectRoot: string, sdkLib?: string): Promise<string | null> {
  const candidates = sdkLib ? [sdkLib, ...CANDIDATE_DIRS] : CANDIDATE_DIRS;
  for (const candidate of candidates) {
    try {
      await readdir(join(projectRoot, candidate));
      return join(projectRoot, candidate);
    } catch {
      continue;
    }
  }
  return null;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];

  const namedPattern = /^export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/gm;
  let match;
  while ((match = namedPattern.exec(content)) !== null) {
    exports.push(match[1]);
  }

  const blockPattern = /^export\s+\{([^}]+)\}/gm;
  while ((match = blockPattern.exec(content)) !== null) {
    const names = match[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    exports.push(...names);
  }

  return [...new Set(exports)];
}

async function scanDir(dir: string, projectRoot: string, results: ApiFile[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanDir(fullPath, projectRoot, results);
      continue;
    }
    const ext = extname(entry.name);
    if (![".ts", ".tsx"].includes(ext)) continue;
    if (/\.(test|spec)\./.test(entry.name)) continue;

    try {
      const content = await readFile(fullPath, "utf-8");
      const exports = extractExports(content);
      if (exports.length > 0) {
        results.push({
          name: entry.name.replace(ext, ""),
          relativePath: fullPath.replace(projectRoot + "/", ""),
          exports,
        });
      }
    } catch {
      // skip unreadable files
    }
  }
}

export async function getOrvalApiSurface(projectRoot: string): Promise<ApiFile[]> {
  const config = await loadConfig(projectRoot);
  const sdkLib = config.orval?.sdkLib;

  const sdkDir = await findSdkDir(projectRoot, sdkLib);
  if (!sdkDir) return [];

  const results: ApiFile[] = [];
  await scanDir(sdkDir, projectRoot, results);
  return results;
}

export function formatApiSurface(files: ApiFile[]): string {
  if (files.length === 0) {
    return [
      "No orval-generated SDK found.",
      "",
      "Run `yarn orval` to generate it, then ensure `mcp.config.json` has:",
      '```json',
      '{ "orval": { "sdkLib": "libs/react-query-sdk" } }',
      '```',
    ].join("\n");
  }

  const totalExports = files.reduce((acc, f) => acc + f.exports.length, 0);
  const lines = [
    "# Orval API Surface",
    "",
    `${files.length} files · ${totalExports} exports`,
    "Use these hooks and types — do not write Supabase queries manually.",
    "",
  ];

  for (const f of files) {
    lines.push(`## ${f.name}`, `File: ${f.relativePath}`);
    if (f.exports.length > 0) {
      lines.push(`Exports: ${f.exports.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

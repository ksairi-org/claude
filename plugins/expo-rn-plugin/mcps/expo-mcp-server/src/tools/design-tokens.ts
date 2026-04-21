import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";

interface TokenFile {
  name: string;
  relativePath: string;
  content: string;
}

const CANDIDATE_DIRS = [
  "src/theme/tokens",
  "src/theme",
  "src/tokens",
  "src/design-tokens",
];

async function findTokensDir(projectRoot: string): Promise<string | null> {
  for (const candidate of CANDIDATE_DIRS) {
    try {
      await readdir(join(projectRoot, candidate));
      return join(projectRoot, candidate);
    } catch {
      continue;
    }
  }
  return null;
}

export async function getDesignTokens(projectRoot: string): Promise<TokenFile[]> {
  const tokensDir = await findTokensDir(projectRoot);
  if (!tokensDir) return [];

  const entries = await readdir(tokensDir, { withFileTypes: true });
  const results: TokenFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const ext = extname(entry.name);
    if (![".ts", ".js"].includes(ext)) continue;

    const fullPath = join(tokensDir, entry.name);
    const content = await readFile(fullPath, "utf-8");
    results.push({
      name: entry.name.replace(ext, ""),
      relativePath: fullPath.replace(projectRoot + "/", ""),
      content,
    });
  }

  return results;
}

export function formatDesignTokens(tokens: TokenFile[], projectRoot: string): string {
  if (tokens.length === 0) {
    const checked = CANDIDATE_DIRS.map((d) => `  - ${d}`).join("\n");
    return `No design token files found. Checked:\n${checked}`;
  }

  const lines = [
    "# Design Tokens",
    "",
    "Use $token references — raw hex/rgba strings will error at compile time.",
    "",
  ];

  for (const token of tokens) {
    lines.push(`## ${token.name}`, `File: ${token.relativePath}`, "", "```typescript", token.content.trim(), "```", "");
  }

  return lines.join("\n");
}

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

interface MigrationResult {
  path: string;
  fileName: string;
  content: string;
}

function migrationTimestamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

export async function generateMigration(
  projectRoot: string,
  name: string,
  sql?: string,
): Promise<MigrationResult> {
  const migrationsDir = join(projectRoot, "supabase", "migrations");
  await mkdir(migrationsDir, { recursive: true });

  const safeName = name.trim().replace(/\s+/g, "_").toLowerCase();
  const fileName = `${migrationTimestamp()}_${safeName}.sql`;
  const filePath = join(migrationsDir, fileName);

  const content = sql?.trim()
    ? sql.trim() + "\n"
    : `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n-- Add your SQL here\n`;

  await writeFile(filePath, content, "utf-8");

  return { path: filePath, fileName, content };
}

export function formatMigrationResult(result: MigrationResult): string {
  return [
    "## Migration created",
    `File: ${result.path}`,
    "",
    "```sql",
    result.content.trim(),
    "```",
  ].join("\n");
}

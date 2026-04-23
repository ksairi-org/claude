#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fetchVariables } from "../lib/api.js";
import { parseVariables } from "../lib/parse.js";
import { COLLECTION_GENERATORS } from "../lib/generate.js";

// ─── Args ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const args = parseArgs(process.argv);
const fileId = args.fileId;
const outDir = args.out;
const token = process.env.FIGMA_TOKEN || process.env.FIGMA_API_KEY;

if (!fileId || !outDir) {
  console.error("Usage: figma-tamagui-sync --fileId=<id> --out=<dir>");
  process.exit(1);
}

if (!token) {
  console.error("Error: FIGMA_TOKEN or FIGMA_API_KEY must be set.");
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[figma-tamagui-sync] Fetching variables from file ${fileId}...`);

  const data = await fetchVariables(fileId, token);
  const collections = parseVariables(data);

  const found = Object.keys(collections);
  console.log(`[figma-tamagui-sync] Found collections: ${found.join(", ")}`);

  let written = 0;

  for (const [collectionName, generator] of Object.entries(COLLECTION_GENERATORS)) {
    const collection = collections[collectionName];
    if (!collection) {
      console.warn(`[figma-tamagui-sync] Skipping "${collectionName}" — not found in file.`);
      continue;
    }

    const content = generator.fn(collection);
    const filePath = join(outDir, generator.outPath);

    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf8");
    console.log(`[figma-tamagui-sync] Wrote ${filePath}`);
    written++;
  }

  console.log(`[figma-tamagui-sync] Done. ${written} file(s) updated.`);
}

main().catch((err) => {
  console.error(`[figma-tamagui-sync] Error: ${err.message}`);
  process.exit(1);
});

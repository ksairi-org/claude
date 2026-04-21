import execa from "execa";
import { readdir } from "fs/promises";
import { join } from "path";

interface E2eTestResult {
  flow: string;
  passed: boolean;
  output: string;
  error?: string;
}

export async function listFlows(projectRoot: string): Promise<string[]> {
  const maestroDir = join(projectRoot, ".maestro");
  try {
    const entries = await readdir(maestroDir);
    return entries.filter((e) => e.endsWith(".yaml") || e.endsWith(".yml"));
  } catch {
    return [];
  }
}

export async function runE2eTest(
  projectRoot: string,
  flow: string,
): Promise<E2eTestResult> {
  const flowPath = flow.startsWith("/")
    ? flow
    : join(projectRoot, ".maestro", flow);

  const result = await execa("maestro", ["test", flowPath], {
    cwd: projectRoot,
    reject: false,
  });

  return {
    flow,
    passed: result.exitCode === 0,
    output: result.stdout || result.stderr || "",
    error: result.exitCode !== 0 ? result.stderr : undefined,
  };
}

export function formatE2eResult(result: E2eTestResult, flows: string[]): string {
  const status = result.passed ? "PASSED" : "FAILED";
  const lines = [`## E2E Test: ${result.flow}`, `Status: ${status}`, ""];

  if (result.output) {
    lines.push("### Output", "```", result.output.trim(), "```");
  }
  if (result.error && !result.output.includes(result.error)) {
    lines.push("", "### Error", result.error.trim());
  }
  if (flows.length > 0) {
    lines.push("", `### Available flows`, flows.map((f) => `- ${f}`).join("\n"));
  }

  return lines.join("\n");
}

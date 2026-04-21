import execa from "execa";

interface EasBuild {
  id: string;
  status: string;
  platform: string;
  buildProfile: string;
  createdAt: string;
  completedAt?: string;
  buildDetailsPageUrl?: string;
  artifacts?: { buildUrl?: string };
}

export async function getEasBuildStatus(
  projectRoot: string,
  profile?: string,
  platform?: string,
  limit = 10,
): Promise<EasBuild[]> {
  const args = [
    "build:list",
    "--json",
    "--non-interactive",
    "--limit",
    String(limit),
  ];
  if (profile) args.push("--profile", profile);
  if (platform) args.push("--platform", platform);

  const result = await execa("eas", args, { cwd: projectRoot, reject: false });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "eas build:list failed");
  }

  try {
    return JSON.parse(result.stdout) as EasBuild[];
  } catch {
    throw new Error(`Could not parse eas output: ${result.stdout}`);
  }
}

export function formatEasStatus(builds: EasBuild[]): string {
  if (builds.length === 0) return "No builds found.";

  const statusIcon: Record<string, string> = {
    FINISHED: "✓",
    ERRORED: "✗",
    CANCELLED: "⊘",
    IN_QUEUE: "⏳",
    IN_PROGRESS: "⚙",
    NEW: "·",
  };

  const lines = [`## EAS Build Status (${builds.length} builds)`, ""];

  for (const b of builds) {
    const icon = statusIcon[b.status] ?? "?";
    lines.push(
      `${icon} **${b.buildProfile}** · ${b.platform} · ${b.status}`,
      `  Created: ${new Date(b.createdAt).toLocaleString()}`,
    );
    if (b.completedAt) {
      lines.push(`  Completed: ${new Date(b.completedAt).toLocaleString()}`);
    }
    if (b.buildDetailsPageUrl) {
      lines.push(`  URL: ${b.buildDetailsPageUrl}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

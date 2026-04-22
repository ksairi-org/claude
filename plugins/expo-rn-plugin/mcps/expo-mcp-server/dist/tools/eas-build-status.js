"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEasBuildStatus = getEasBuildStatus;
exports.formatEasStatus = formatEasStatus;
const execa_1 = __importDefault(require("execa"));
async function getEasBuildStatus(projectRoot, profile, platform, limit = 10) {
    const args = [
        "build:list",
        "--json",
        "--non-interactive",
        "--limit",
        String(limit),
    ];
    if (profile)
        args.push("--profile", profile);
    if (platform)
        args.push("--platform", platform);
    const result = await (0, execa_1.default)("eas", args, { cwd: projectRoot, reject: false });
    if (result.exitCode !== 0) {
        throw new Error(result.stderr || "eas build:list failed");
    }
    try {
        return JSON.parse(result.stdout);
    }
    catch {
        throw new Error(`Could not parse eas output: ${result.stdout}`);
    }
}
function formatEasStatus(builds) {
    if (builds.length === 0)
        return "No builds found.";
    const statusIcon = {
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
        lines.push(`${icon} **${b.buildProfile}** · ${b.platform} · ${b.status}`, `  Created: ${new Date(b.createdAt).toLocaleString()}`);
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

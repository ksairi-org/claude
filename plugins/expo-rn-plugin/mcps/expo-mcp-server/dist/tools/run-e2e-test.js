"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFlows = listFlows;
exports.runE2eTest = runE2eTest;
exports.formatE2eResult = formatE2eResult;
const execa_1 = __importDefault(require("execa"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
async function listFlows(projectRoot) {
    const maestroDir = (0, path_1.join)(projectRoot, ".maestro");
    try {
        const entries = await (0, promises_1.readdir)(maestroDir);
        return entries.filter((e) => e.endsWith(".yaml") || e.endsWith(".yml"));
    }
    catch {
        return [];
    }
}
async function runE2eTest(projectRoot, flow) {
    const flowPath = flow.startsWith("/")
        ? flow
        : (0, path_1.join)(projectRoot, ".maestro", flow);
    const result = await (0, execa_1.default)("maestro", ["test", flowPath], {
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
function formatE2eResult(result, flows) {
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

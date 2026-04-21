import { loadConfig, configSummary } from "./load-config";

export async function getConfig(projectRoot: string): Promise<string> {
  const config = await loadConfig(projectRoot);
  return configSummary(config);
}

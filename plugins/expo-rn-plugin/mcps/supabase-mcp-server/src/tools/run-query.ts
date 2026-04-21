import { runSql } from "../supabase";

export async function runQuery(
  query: string,
): Promise<Record<string, unknown>[]> {
  return runSql(query);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbClient = void 0;
exports.runSql = runSql;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function runSql(query) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
        method: "POST",
        headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`run_sql failed: ${err}`);
    }
    return response.json();
}
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}
exports.dbClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);

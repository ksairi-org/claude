"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQuery = runQuery;
const supabase_1 = require("../supabase");
async function runQuery(query) {
    return (0, supabase_1.runSql)(query);
}

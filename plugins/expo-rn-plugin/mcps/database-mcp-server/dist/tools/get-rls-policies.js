"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRlsPolicies = getRlsPolicies;
const db_client_1 = require("../db-client");
function pgIdent(name) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid SQL identifier: "${name}"`);
    }
    return name;
}
async function getRlsPolicies(tableName) {
    const tableFilter = tableName ? `AND tablename = '${pgIdent(tableName)}'` : "";
    const rows = await (0, db_client_1.runSql)(`
    SELECT tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'api'
    ${tableFilter}
    ORDER BY tablename, policyname
  `);
    return rows.map((row) => ({
        table_name: row.tablename,
        policy_name: row.policyname,
        command: row.cmd,
        permissive: row.permissive,
        roles: row.roles,
        qual: row.qual,
        with_check: row.with_check,
    }));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTables = getTables;
const db_client_1 = require("../db-client");
async function getTables() {
    const rows = await (0, db_client_1.runSql)(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema = 'api'
    ORDER BY c.table_name, c.ordinal_position
  `);
    const tablesMap = {};
    for (const col of rows) {
        const tableName = col.table_name;
        if (!tablesMap[tableName])
            tablesMap[tableName] = [];
        tablesMap[tableName].push({
            column_name: col.column_name,
            data_type: col.data_type,
            is_nullable: col.is_nullable,
            column_default: col.column_default,
        });
    }
    return Object.entries(tablesMap).map(([table_name, columns]) => ({
        table_name,
        columns,
    }));
}

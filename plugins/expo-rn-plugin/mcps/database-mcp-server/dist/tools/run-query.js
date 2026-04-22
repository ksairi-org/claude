"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQuery = runQuery;
const db_client_1 = require("../db-client");
async function runQuery(query) {
    return (0, db_client_1.runSql)(query);
}

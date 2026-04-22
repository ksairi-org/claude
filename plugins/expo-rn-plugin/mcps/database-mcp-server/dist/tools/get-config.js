"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const load_config_1 = require("./load-config");
async function getConfig(projectRoot) {
    const config = await (0, load_config_1.loadConfig)(projectRoot);
    return (0, load_config_1.configSummary)(config);
}

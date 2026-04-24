// Figma plugin: exports design token variables back to JSON.
// Designer runs this after making changes; developer commits the output.

figma.showUI(__html__, { width: 520, height: 600, title: "Export Design Tokens" });

function rgbaToString(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;
  return a === 1
    ? "rgba(" + r + "," + g + "," + b + ",1)"
    : "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

function exportTokens() {
  const collections = figma.variables.getLocalVariableCollections();
  const result = {};

  for (const col of collections) {
    const colName = col.name;
    result[colName] = {};

    for (const varId of col.variableIds) {
      const variable = figma.variables.getVariableById(varId);
      if (!variable) continue;

      for (const mode of col.modes) {
        const modeKey = mode.name;
        if (!result[colName][modeKey]) result[colName][modeKey] = {};

        const raw = variable.valuesByMode[mode.modeId];
        let value;

        if (variable.resolvedType === "COLOR") {
          value = rgbaToString(raw);
        } else {
          value = raw;
        }

        result[colName][modeKey][variable.name] = value;
      }
    }
  }

  return result;
}

const tokens = exportTokens();
figma.ui.postMessage({ type: "tokens", data: JSON.stringify(tokens, null, 2) });

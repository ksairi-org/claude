/**
 * Transforms raw Figma Variables API response into a structured map keyed by
 * collection name, ready for the generator.
 *
 * Output shape:
 * {
 *   "Colors": { modes: [{modeId, name}], variables: [{name, resolvedType, valuesByMode}] },
 *   "Sizes & Spaces": { ... },
 *   ...
 * }
 */
export function parseVariables(data) {
  const { variableCollections, variables } = data.meta;
  const result = {};

  for (const col of Object.values(variableCollections)) {
    result[col.name] = {
      modes: col.modes,
      defaultModeId: col.defaultModeId,
      variables: col.variableIds
        .map((id) => variables[id])
        .filter(Boolean),
    };
  }

  return result;
}

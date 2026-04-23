const HEADER = `/**\n * Auto Generated from Figma\n * Do not edit manually.\n */\n`;

// Tamagui requires these keys on every theme object. Values are derived from
// semantic tokens where possible, falling back to sensible defaults.
const TAMAGUI_REQUIRED_DEFAULTS = {
  color:              (t) => t["text-body"]      ?? "rgba(0,0,0,1)",
  background:         (t) => t["background-page"] ?? "rgba(255,255,255,1)",
  backgroundHover:    (t) => t["background-subtle-hover"] ?? t["background-subtle"] ?? "rgba(237,240,242,1)",
  borderColor:        (t) => t["border-subtle"]  ?? "rgba(211,220,229,1)",
  borderColorHover:   (t) => t["border-strong"]  ?? "rgba(44,54,64,1)",
  borderColorFocus:   (t) => t["border-brand"]   ?? "rgba(0,122,255,1)",
};

// ─── Color helpers ────────────────────────────────────────────────────────────

function figmaColorToRgba({ r, g, b, a }) {
  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);
  const A = a === 1 ? 1 : parseFloat(a.toFixed(2));
  return `rgba(${R},${G},${B},${A})`;
}

function isColor(value) {
  return value && typeof value === "object" && "r" in value;
}

// ─── File generators ──────────────────────────────────────────────────────────

/**
 * Colors collection → themes.ts
 * Each mode (Light, Dark) becomes a theme key.
 * Tamagui-required keys are injected as derived defaults so components work
 * out of the box without those tokens needing to exist in Figma.
 */
export function generateThemes(collection) {
  const themes = {};

  for (const mode of collection.modes) {
    const key = mode.name.toLowerCase();
    const tokens = {};

    for (const variable of collection.variables) {
      const value = variable.valuesByMode[mode.modeId];
      if (isColor(value)) {
        tokens[variable.name] = figmaColorToRgba(value);
      }
    }

    // Inject required Tamagui theme keys derived from semantic tokens.
    // Only set them if not already defined as a Figma variable.
    for (const [requiredKey, derive] of Object.entries(TAMAGUI_REQUIRED_DEFAULTS)) {
      if (!(requiredKey in tokens)) {
        tokens[requiredKey] = derive(tokens);
      }
    }

    themes[key] = tokens;
  }

  return (
    HEADER +
    `\nconst themes = ${JSON.stringify(themes, null, 2)};\n\nexport { themes };\n`
  );
}

/**
 * Sizes & Spaces collection → tokens/sizesSpaces.ts
 */
export function generateSizesSpaces(collection) {
  const sizes = extractFloats(collection);
  // `true` is Tamagui's default size key — always derived, never stored in Figma.
  sizes.true = sizes.md ?? 16;
  return moduleFile("sizesSpaces", sizes);
}

/**
 * Radius collection → tokens/radius.ts
 */
export function generateRadius(collection) {
  const r = extractFloats(collection);
  // `true` is Tamagui's default radius key — always derived, never stored in Figma.
  r.true = r.xl ?? r.md ?? 16;
  return moduleFile("radius", r);
}

/**
 * Font Sizes collection → tokens/fonts/fontSizes.ts
 */
export function generateFontSizes(collection) {
  const sizes = {};
  const modeId = collection.defaultModeId;
  for (const variable of collection.variables) {
    const value = variable.valuesByMode[modeId];
    if (typeof value === "number") {
      sizes[variable.name.replace(/^size-/, "")] = value;
    }
  }
  return moduleFile("fontSizes", sizes);
}

/**
 * Line Heights collection → tokens/fonts/lineHeights.ts
 */
export function generateLineHeights(collection) {
  const heights = {};
  const modeId = collection.defaultModeId;
  for (const variable of collection.variables) {
    const value = variable.valuesByMode[modeId];
    if (typeof value === "number") {
      heights[variable.name.replace(/^lineHeight-/, "")] = value;
    }
  }
  return moduleFile("lineHeights", heights);
}

/**
 * Letter Spacing collection → tokens/fonts/letterSpacing.ts
 */
export function generateLetterSpacing(collection) {
  const spacing = {};
  const modeId = collection.defaultModeId;
  for (const variable of collection.variables) {
    const value = variable.valuesByMode[modeId];
    if (typeof value === "number") {
      spacing[variable.name.replace(/^letterSpacing-/, "")] = value;
    }
  }
  return moduleFile("letterSpacing", spacing);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function extractFloats(collection) {
  const out = {};
  const modeId = collection.defaultModeId;
  for (const variable of collection.variables) {
    const value = variable.valuesByMode[modeId];
    if (typeof value === "number") {
      out[variable.name] = value;
    }
  }
  return out;
}

function moduleFile(exportName, obj) {
  return (
    HEADER +
    `\nconst ${exportName} = ${JSON.stringify(obj, null, 2)};\n\nexport { ${exportName} };\n`
  );
}

// ─── Collection → generator mapping ──────────────────────────────────────────

export const COLLECTION_GENERATORS = {
  "Colors":          { fn: generateThemes,        outPath: "themes.ts" },
  "Sizes & Spaces":  { fn: generateSizesSpaces,   outPath: "tokens/sizesSpaces.ts" },
  "Radius":          { fn: generateRadius,         outPath: "tokens/radius.ts" },
  "Font Sizes":      { fn: generateFontSizes,      outPath: "tokens/fonts/fontSizes.ts" },
  "Line Heights":    { fn: generateLineHeights,    outPath: "tokens/fonts/lineHeights.ts" },
  "Letter Spacing":  { fn: generateLetterSpacing,  outPath: "tokens/fonts/letterSpacing.ts" },
};

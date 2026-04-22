"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runI18nCheck = runI18nCheck;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const execa_1 = require("execa");
// ─── PO Parser ────────────────────────────────────────────────────────────────
/**
 * Minimal but robust .po parser.
 * Handles multi-line msgid/msgstr and common flags.
 */
function parsePo(content) {
    const entries = [];
    // Normalise line endings
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    let currentEntry = {};
    let fuzzy = false;
    const flush = () => {
        if (currentEntry.msgid && currentEntry.msgid !== "") {
            entries.push({
                msgid: currentEntry.msgid,
                msgstr: currentEntry.msgstr ?? "",
                fuzzy,
                file: currentEntry.file,
                line: currentEntry.line,
            });
        }
        currentEntry = {};
        fuzzy = false;
    };
    for (const raw of lines) {
        const line = raw.trim();
        // Blank line = block separator
        if (line === "") {
            flush();
            continue;
        }
        // Flags
        if (line.startsWith("#,") && line.includes("fuzzy")) {
            fuzzy = true;
            continue;
        }
        // Source reference  (#: src/foo.tsx:42)
        if (line.startsWith("#:")) {
            const ref = line.slice(2).trim().split(":")[0];
            currentEntry.file = ref;
            continue;
        }
        // Start of msgid
        if (line.startsWith("msgid ")) {
            currentEntry.inMsgid = true;
            currentEntry.inMsgstr = false;
            currentEntry.msgid = extractPoString(line.slice(6));
            continue;
        }
        // Start of msgstr
        if (line.startsWith("msgstr ")) {
            currentEntry.inMsgid = false;
            currentEntry.inMsgstr = true;
            currentEntry.msgstr = extractPoString(line.slice(7));
            continue;
        }
        // Continuation line
        if (line.startsWith('"')) {
            const value = extractPoString(line);
            if (currentEntry.inMsgid) {
                currentEntry.msgid = (currentEntry.msgid ?? "") + value;
            }
            else if (currentEntry.inMsgstr) {
                currentEntry.msgstr = (currentEntry.msgstr ?? "") + value;
            }
        }
    }
    flush();
    return entries;
}
function extractPoString(s) {
    // Remove surrounding quotes and unescape
    const match = s.match(/^"(.*)"$/);
    if (!match)
        return "";
    return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
}
// ─── Catalog loader ───────────────────────────────────────────────────────────
function loadCatalog(projectRoot, config, locale) {
    const catalog = new Map();
    const format = config.catalogFormat ?? "po";
    if (format === "po") {
        // Support both single-file (messages.po) and split-catalog layouts
        // (e.g. exported/{locale}/app.po, components.po, screens.po)
        const localeRoot = path.join(projectRoot, config.localesDir);
        const poFiles = glob_1.glob.sync(`**/${locale}/**/*.po`, { cwd: localeRoot, absolute: true });
        if (poFiles.length === 0)
            return catalog;
        for (const poFile of poFiles) {
            const content = fs.readFileSync(poFile, "utf-8");
            for (const entry of parsePo(content)) {
                catalog.set(entry.msgid, entry);
            }
        }
    }
    else {
        // JSON catalog (Lingui v4+ default)
        const jsonPath = path.join(projectRoot, config.localesDir, locale, "messages.json");
        if (!fs.existsSync(jsonPath))
            return catalog;
        const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        for (const [msgid, value] of Object.entries(raw)) {
            if (value.obsolete)
                continue;
            catalog.set(msgid, {
                msgid,
                msgstr: value.translation ?? "",
                fuzzy: false,
            });
        }
    }
    return catalog;
}
// ─── Untranslated check ───────────────────────────────────────────────────────
function checkUntranslated(projectRoot, config) {
    const results = [];
    for (const locale of config.targetLocales) {
        const catalog = loadCatalog(projectRoot, config, locale);
        for (const [msgid, entry] of catalog) {
            if (entry.fuzzy) {
                results.push({ locale, key: msgid, reason: "fuzzy" });
            }
            else if (!entry.msgstr || entry.msgstr.trim() === "") {
                results.push({ locale, key: msgid, reason: "empty" });
            }
        }
    }
    return results;
}
// ─── Missing keys check ───────────────────────────────────────────────────────
function checkMissingKeys(projectRoot, config) {
    const results = [];
    const sourceCatalog = loadCatalog(projectRoot, config, config.sourceLocale);
    for (const locale of config.targetLocales) {
        if (locale === config.sourceLocale)
            continue;
        const targetCatalog = loadCatalog(projectRoot, config, locale);
        for (const [msgid, entry] of sourceCatalog) {
            if (!targetCatalog.has(msgid)) {
                results.push({
                    locale,
                    key: msgid,
                    sourceValue: entry.msgstr || msgid,
                });
            }
        }
    }
    return results;
}
// ─── Hardcoded string detection ───────────────────────────────────────────────
/**
 * Heuristics for finding bare strings in JSX that should be translated.
 *
 * Catches:
 *   <Text>Hello world</Text>
 *   title="Submit"   placeholder="Enter name"
 *   label={"Confirm"}
 *
 * Skips:
 *   {t`Hello`}  <Trans>Hello</Trans>  strings that are only symbols/numbers
 *   test IDs, class names, URLs, console.log args
 */
const HARDCODED_PATTERNS = [
    {
        // JSX text content between tags — inline (>Text<) or multiline (>\n  Text\n<)
        pattern: />[\s]*([A-Z][^<{}\n]{3,})[\s]*</g,
        contextKey: "JSX text content",
        extract: (m) => m[1].trim(),
    },
    {
        // JSX string expression: >{"Some Text"}< (inline) or multiline:
        //   <Tag>
        //     {"Some Text"}
        // Allows optional whitespace/newlines between > and {
        pattern: />[\s]*\{["']([A-Z][^"'\n]{3,})["']\}/g,
        contextKey: "JSX string expression",
        extract: (m) => m[1].trim(),
    },
    {
        // Common UI props with string literals
        pattern: /(?:title|label|placeholder|hint|accessibilityLabel|description)=["']([^"']{3,})["']/g,
        contextKey: "prop string literal",
        extract: (m) => m[1],
    },
    {
        // Same props with JSX string expressions
        pattern: /(?:title|label|placeholder|hint|accessibilityLabel|description)=\{"([^"]{3,})"\}/g,
        contextKey: "prop JSX string",
        extract: (m) => m[1],
    },
];
// Strings that are definitely not UI copy
const SKIP_PATTERNS = [
    /^https?:\/\//, // URLs
    /^[a-z][a-zA-Z0-9_-]+$/, // camelCase identifiers / test IDs
    /^\d+$/, // pure numbers
    /^[#$@]/, // symbols
    /^[A-Z_]+$/, // ALL_CAPS constants
];
async function checkHardcoded(projectRoot, config) {
    const results = [];
    const files = await (0, glob_1.glob)(config.sourceGlobs, {
        cwd: projectRoot,
        absolute: true,
    });
    for (const file of files) {
        // Skip generated files
        if (file.includes("node_modules") || file.includes(".generated."))
            continue;
        const content = fs.readFileSync(file, "utf-8");
        // Skip files that never import Trans/t — likely not UI components.
        // Also always scan screen and component files even without an i18n import,
        // so new screens that forgot to add Lingui are still caught.
        const hasI18nImport = content.includes("from '@lingui/macro'") ||
            content.includes('from "@lingui/macro"') ||
            content.includes("from '@lingui/react'") ||
            content.includes('from "@lingui/react"') ||
            content.includes("useLingui");
        const isUiFile = /\/(screens|components)\//.test(file);
        if (!hasI18nImport && !isUiFile)
            continue;
        const lines = content.split("\n");
        for (const { pattern, contextKey, extract } of HARDCODED_PATTERNS) {
            pattern.lastIndex = 0; // reset stateful regex
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const text = extract(match);
                // Skip noise
                if (SKIP_PATTERNS.some((p) => p.test(text)))
                    continue;
                if (text.length < 3)
                    continue;
                // Already wrapped in Trans or t``?
                const surroundingCode = content.slice(Math.max(0, match.index - 60), match.index + match[0].length + 60);
                if (/<Trans>|{t`|{t\(/.test(surroundingCode))
                    continue;
                // Find line number
                const upToMatch = content.slice(0, match.index);
                const lineNumber = upToMatch.split("\n").length;
                const lineContent = lines[lineNumber - 1]?.trim() ?? "";
                results.push({
                    file: path.relative(projectRoot, file),
                    line: lineNumber,
                    text,
                    context: `${contextKey}: ${lineContent.slice(0, 80)}`,
                });
            }
        }
    }
    return results;
}
// ─── Lingui extract runner ────────────────────────────────────────────────────
/**
 * Snapshots catalog keys before and after running `lingui extract --clean`,
 * so we can report what was added and what was removed.
 *
 * Uses --clean to strip obsolete keys from the catalog.
 * Runs in the project root so lingui.config.ts is resolved correctly.
 */
async function runLinguiExtract(projectRoot, config) {
    // Snapshot keys before extraction
    const before = loadCatalog(projectRoot, config, config.sourceLocale);
    const beforeKeys = new Set(before.keys());
    const start = Date.now();
    const { stdout, stderr, exitCode } = await (0, execa_1.command)("npx lingui extract --clean", {
        cwd: projectRoot,
        reject: false, // don't throw — we handle non-zero exit ourselves
        env: {
            ...process.env,
            // ensure CI=true so lingui doesn't prompt interactively
            CI: "true",
        },
    });
    const durationMs = Date.now() - start;
    if (exitCode !== 0) {
        throw new Error(`lingui extract exited with code ${exitCode}:\n${stderr || stdout}`);
    }
    // Snapshot keys after extraction
    const after = loadCatalog(projectRoot, config, config.sourceLocale);
    const afterKeys = new Set(after.keys());
    const newKeys = [...afterKeys].filter((k) => !beforeKeys.has(k));
    const removedKeys = [...beforeKeys].filter((k) => !afterKeys.has(k));
    return {
        ranExtract: true,
        newKeys,
        removedKeys,
        stdout: stdout.trim(),
        durationMs,
    };
}
// ─── Variable mismatch check ─────────────────────────────────────────────────
/**
 * Extracts ICU variable names from a string.
 * Handles both simple variables ({name}) and complex ICU constructs ({count, plural, ...}).
 */
function extractIcuVariables(str) {
    const vars = new Set();
    // Simple: {varName}
    const simpleRe = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    let m;
    while ((m = simpleRe.exec(str)) !== null) {
        vars.add(m[1]);
    }
    // Complex ICU: {varName, plural/select/number, ...}
    const complexRe = /\{([a-zA-Z_][a-zA-Z0-9_]*)\s*,/g;
    while ((m = complexRe.exec(str)) !== null) {
        vars.add(m[1]);
    }
    return vars;
}
function checkVariableMismatch(projectRoot, config) {
    const results = [];
    const sourceCatalog = loadCatalog(projectRoot, config, config.sourceLocale);
    for (const locale of config.targetLocales) {
        if (locale === config.sourceLocale)
            continue;
        const targetCatalog = loadCatalog(projectRoot, config, locale);
        for (const [msgid, sourceEntry] of sourceCatalog) {
            const targetEntry = targetCatalog.get(msgid);
            if (!targetEntry || !targetEntry.msgstr)
                continue;
            const sourceVars = extractIcuVariables(sourceEntry.msgstr || msgid);
            const targetVars = extractIcuVariables(targetEntry.msgstr);
            const missingVars = [...sourceVars].filter((v) => !targetVars.has(v));
            const extraVars = [...targetVars].filter((v) => !sourceVars.has(v));
            if (missingVars.length > 0 || extraVars.length > 0) {
                results.push({ locale, key: msgid, missingVars, extraVars });
            }
        }
    }
    return results;
}
// ─── Plural forms check ───────────────────────────────────────────────────────
/**
 * Plural categories required per locale (CLDR simplified).
 * Locales not listed here default to ["one", "other"].
 */
const PLURAL_FORMS_BY_LOCALE = {
    // Germanic / Romance — one + other
    en: ["one", "other"],
    es: ["one", "other"],
    fr: ["one", "other"],
    de: ["one", "other"],
    pt: ["one", "other"],
    it: ["one", "other"],
    nl: ["one", "other"],
    sv: ["one", "other"],
    da: ["one", "other"],
    nb: ["one", "other"],
    fi: ["one", "other"],
    hu: ["one", "other"],
    tr: ["one", "other"],
    // East Asian — other only
    ja: ["other"],
    zh: ["other"],
    ko: ["other"],
    // Slavic — one + few + many + other
    ru: ["one", "few", "many", "other"],
    pl: ["one", "few", "many", "other"],
    cs: ["one", "few", "many", "other"],
    uk: ["one", "few", "many", "other"],
    // Arabic — full six-form set
    ar: ["zero", "one", "two", "few", "many", "other"],
};
const PLURAL_CATEGORY_RE = /\b(zero|one|two|few|many|other)\s*\{/g;
function extractPluralCategories(str) {
    const cats = [];
    // Check for ICU plural construct: {varName, plural, ...}
    if (!/, plural,/.test(str))
        return cats;
    PLURAL_CATEGORY_RE.lastIndex = 0;
    let m;
    while ((m = PLURAL_CATEGORY_RE.exec(str)) !== null) {
        cats.push(m[1]);
    }
    return cats;
}
function checkPluralForms(projectRoot, config) {
    const results = [];
    const sourceCatalog = loadCatalog(projectRoot, config, config.sourceLocale);
    for (const locale of config.targetLocales) {
        if (locale === config.sourceLocale)
            continue;
        const targetCatalog = loadCatalog(projectRoot, config, locale);
        const expectedForms = PLURAL_FORMS_BY_LOCALE[locale] ?? ["one", "other"];
        for (const [msgid, sourceEntry] of sourceCatalog) {
            const sourceStr = sourceEntry.msgstr || msgid;
            if (!/, plural,/.test(sourceStr))
                continue; // source has no plural — skip
            const targetEntry = targetCatalog.get(msgid);
            // Translation is missing entirely — missing_keys check will already catch this
            if (!targetEntry || !targetEntry.msgstr)
                continue;
            if (!/, plural,/.test(targetEntry.msgstr)) {
                results.push({
                    locale,
                    key: msgid,
                    reason: "missing_plural",
                    expectedForms,
                    foundForms: [],
                });
                continue;
            }
            const foundForms = extractPluralCategories(targetEntry.msgstr);
            const missingForms = expectedForms.filter((f) => !foundForms.includes(f));
            if (missingForms.length > 0) {
                results.push({
                    locale,
                    key: msgid,
                    reason: "incomplete_forms",
                    expectedForms,
                    foundForms,
                });
            }
        }
    }
    return results;
}
async function runI18nCheck(projectRoot, config, options = {}) {
    const errors = [];
    const { extract = false, checks = ["untranslated", "missing_keys", "hardcoded"], } = options;
    const i18nConfig = config.i18n;
    if (!i18nConfig) {
        return {
            summary: { untranslated: 0, missingKeys: 0, hardcoded: 0 },
            untranslated: [],
            missingKeys: [],
            hardcoded: [],
            errors: ["No `i18n` key found in mcp.config.json"],
        };
    }
    const required = [
        "localesDir",
        "sourceLocale",
        "targetLocales",
        "sourceGlobs",
    ];
    for (const key of required) {
        if (!i18nConfig[key])
            errors.push(`Missing i18n.${key} in mcp.config.json`);
    }
    if (errors.length > 0) {
        return {
            summary: { untranslated: 0, missingKeys: 0, hardcoded: 0 },
            untranslated: [],
            missingKeys: [],
            hardcoded: [],
            errors,
        };
    }
    // ── Optional: run lingui extract first ──────────────────────────────────────
    let extraction;
    if (extract) {
        try {
            extraction = await runLinguiExtract(projectRoot, i18nConfig);
        }
        catch (e) {
            errors.push(`lingui extract failed: ${e.message}`);
            // Still run catalog checks against whatever state the catalogs are in
        }
    }
    // ── Catalog checks (always run against current catalog state) ───────────────
    let untranslated = [];
    let missingKeys = [];
    let hardcoded = [];
    let variableMismatches;
    let pluralFormIssues;
    if (checks.includes("untranslated")) {
        try {
            untranslated = checkUntranslated(projectRoot, i18nConfig);
        }
        catch (e) {
            errors.push(`untranslated check failed: ${e.message}`);
        }
    }
    if (checks.includes("missing_keys")) {
        try {
            missingKeys = checkMissingKeys(projectRoot, i18nConfig);
        }
        catch (e) {
            errors.push(`missing keys check failed: ${e.message}`);
        }
    }
    if (checks.includes("hardcoded")) {
        try {
            hardcoded = await checkHardcoded(projectRoot, i18nConfig);
        }
        catch (e) {
            errors.push(`hardcoded check failed: ${e.message}`);
        }
    }
    if (checks.includes("variable_mismatch")) {
        try {
            variableMismatches = checkVariableMismatch(projectRoot, i18nConfig);
        }
        catch (e) {
            errors.push(`variable mismatch check failed: ${e.message}`);
        }
    }
    if (checks.includes("plural_forms")) {
        try {
            pluralFormIssues = checkPluralForms(projectRoot, i18nConfig);
        }
        catch (e) {
            errors.push(`plural forms check failed: ${e.message}`);
        }
    }
    return {
        summary: {
            untranslated: untranslated.length,
            missingKeys: missingKeys.length,
            hardcoded: hardcoded.length,
            ...(variableMismatches !== undefined && {
                variableMismatches: variableMismatches.length,
            }),
            ...(pluralFormIssues !== undefined && {
                pluralFormIssues: pluralFormIssues.length,
            }),
            ...(extraction && {
                newKeysFromExtract: extraction.newKeys.length,
                removedKeysFromExtract: extraction.removedKeys.length,
            }),
        },
        ...(extraction && { extraction }),
        untranslated,
        missingKeys,
        hardcoded,
        ...(variableMismatches !== undefined && { variableMismatches }),
        ...(pluralFormIssues !== undefined && { pluralFormIssues }),
        errors,
    };
}

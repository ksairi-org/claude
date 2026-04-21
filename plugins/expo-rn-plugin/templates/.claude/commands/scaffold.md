---
name: scaffold
description: Scaffold a full CRUD feature (types, hooks, screens, routes, form) from a Supabase table
argument-hint: "<table_name>"
---

Scaffold a complete CRUD feature for the table `$ARGUMENTS` using the project's MCP servers.

## Steps

1. **Read project config** — call `get_config` with the current project root to understand the MCP setup (component paths, i18n, firebase config, etc.)

2. **Understand existing structure** — call `get_routes` and `get_components` in parallel so you know where to place the new screen and what components already exist

3. **Inspect schema** — call `get_tables` to confirm the table exists and review its columns; flag any ambiguous columns to the user before proceeding

4. **Generate the form** — call `scaffold_form` with `tableName: "$ARGUMENTS"` and `omitAutoFields: true`

5. **Generate CRUD** — call `scaffold_crud` with `tableName: "$ARGUMENTS"`, `projectRoot: <root>`, `omitAutoFields: true`, `includeForm: true`

6. **Write the files** — place all generated code exactly where `get_routes` and `get_config` indicate; do not invent new paths

7. **i18n** — wrap every user-visible string with `Trans` / `t` tag per project CLAUDE.md

8. **Type-check** — run `tsc --noEmit` and fix all errors before reporting done

## Rules

- Never duplicate a component that already exists — check `get_components` output first
- Follow Tamagui token conventions from CLAUDE.md (no raw hex strings, use `$token` references)
- Consolidate imports per module (no duplicate import lines for the same path)
- If `$ARGUMENTS` is empty, ask the user which table to scaffold before doing anything

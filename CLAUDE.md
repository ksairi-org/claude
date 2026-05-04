# Local Instructions

## README files

Always leave README files with no markdownlint warnings or errors. Run `markdownlint "**/*.md" --ignore "**/node_modules/**"` to check. If not installed: `corepack yarn dlx markdownlint-cli`.

## Package manager

Always use yarn over npm for all package operations. Default to Yarn Berry (v2+) syntax: `yarn dlx <pkg>` for one-off executions (no `yarn global`). Never use `npm` or `npx`.

Exception: `npx` is acceptable inside Claude-internal runtime files such as `.mcp.json` (MCP server launch args), where it is idiomatic for the Claude MCP ecosystem.

## TypeScript

No unsafe type assertions: `as any`, `as never`, `as unknown`. Use the correct concrete type or narrow with a type guard. This applies to both plugin source code and code generated/scaffolded into resulting apps.

## CLAUDE.md templates

Keep `templates/CLAUDE.md` under 80 lines. It loads on every session — detailed guidance belongs in skills/commands, not inline. Max 1–2 bullets per topic + a pointer to the relevant skill.

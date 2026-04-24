# Local Instructions

## README files

Always leave README files with no markdownlint warnings or errors. Run `markdownlint "**/*.md" --ignore "**/node_modules/**"` to check. If not installed: `corepack yarn dlx markdownlint-cli`.

## Package manager

Always use yarn over npm for all package operations. Default to Yarn Berry (v2+) syntax: `yarn dlx <pkg>` for one-off executions (no `yarn global`). Never use `npm` or `npx`.

## CLAUDE.md templates

Keep `templates/CLAUDE.md` under 80 lines. It loads on every session — detailed guidance belongs in skills/commands, not inline. Max 1–2 bullets per topic + a pointer to the relevant skill.

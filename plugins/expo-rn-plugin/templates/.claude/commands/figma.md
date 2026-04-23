---
name: figma
description: Compare the current screen implementation against its Figma design and fix visual discrepancies
argument-hint: "<figma_url_or_node_id>"
---

Run a Figma design review for the current screen and fix visual discrepancies.

## When to use

Only after a significant UI change — a new screen, redesign, or design handoff. Not for small tweaks.

## Steps

1. **Get the design spec** — use `mcp__figma__get_figma_data` with `$ARGUMENTS` as the node URL or ID

2. **Find the implementation file** — locate the screen component that corresponds to the Figma frame (use `get_routes` if unsure)

3. **Compare** — list visual differences: spacing, typography, colors, layout, component usage

4. **Fix** — apply corrections using Tamagui tokens from `src/theme/`:
   - Never use raw hex or rgba — always use `$token` references
   - Check `src/theme/themes.ts` for valid color token names before using one
   - Use `get_components` to find existing components before creating new ones
   - If a Figma token has no equivalent in `src/theme/`, flag it to the user — do not approximate

5. **Download assets if needed** — use `mcp__figma__download_figma_images` for icons or images

6. **Report** — summarise what was changed and what could not be matched

## Rules

- Match the Figma spec exactly — do not redesign or improve it
- Run `tsc --noEmit` after changes to confirm no type errors
- If tokens are stale, ask the user to run `/sync-tokens` first

---
name: preview
description: Take a screenshot of the running iOS simulator or Android emulator, surface device errors, and run tsc. Use after any UI change to verify the result visually before reporting done.
argument-hint: "[route_or_screen_name]"
---

Capture and review the current state of the running simulator after the most recent code change.

## When to use

Call this after every UI change — new screen, layout fix, Tamagui token update, or Figma sync. Do not report a UI task as done without running preview first.

## Steps

1. **Screenshot** — run the capture script:
   ```
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/simulator-screenshot.sh
   ```
   The script prints the PNG path to stdout and emits device error logs to stderr.

2. **Read the image** — use the Read tool on the PNG path returned by the script. You will see the current screen visually.

3. **Check device errors** — review any stderr output from the script for React Native JS errors or native crashes. Fix any errors before continuing.

4. **Type-check** — run `tsc --noEmit` and fix all errors.

5. **Evaluate against intent** — if `$ARGUMENTS` names a specific route or screen, compare the screenshot to what the task asked for:
   - Spacing and alignment match the design
   - No overflow or clipped content
   - Loading states, empty states, and error states render correctly
   - Dark/light theme tokens resolve (not raw hex or transparent fallbacks)

6. **Iterate** — if the visual output doesn't match intent, fix the issue and re-run from step 1. Repeat until the screenshot confirms correctness.

7. **Report** — describe what you see in the screenshot and confirm it matches the task goal. If the simulator isn't running, tell the user to start it with `yarn expo start --ios` or `yarn expo start --android`.

## Rules

- Never skip this skill after a UI change and claim "it should look like X" — verify it
- If the screenshot shows a red error screen, fix the JS error before any other work
- If the simulator is not running, surface the start command — do not fail silently
- `tsc --noEmit` must pass before the task is complete

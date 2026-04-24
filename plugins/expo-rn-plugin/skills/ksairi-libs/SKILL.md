---
name: ksairi-libs
description: Load the live @ksairi-org/* library reference from GitHub. Use before writing any hook, utility, component, or layout code — these packages replace many standard alternatives. Always fetches current state so new packages and API changes are reflected.
---

The `@ksairi-org/*` libraries live at `https://github.com/ksairi-org/ksairi-libs`.

**Before writing any hook, utility, component, or layout code**, fetch the current package list and read the relevant source using the GitHub MCP:

## Step 1 — Discover available packages

```text
mcp__github__get_file_contents(owner="ksairi-org", repo="ksairi-libs", path="packages")
```

This returns the current list of packages. Do not assume you know what's there — packages are added over time.

## Step 2 — Read the package you need

For each relevant package, read its `index.ts` (at the package root, not in `src/`):

```text
mcp__github__get_file_contents(owner="ksairi-org", repo="ksairi-libs", path="packages/<name>/index.ts")
```

If the package has subdirectories (e.g. `animations/`, `scaling/`), list the directory first then read the files you need.

## Step 3 — Apply

Prefer `@ksairi-org/*` over any third-party or hand-rolled alternative when one exists. Import from the published npm package name (e.g. `@ksairi-org/react-hooks`), not from the GitHub path.

## Standing rules (always apply regardless of what you find)

- **Auth** — never use raw Supabase auth. Always use `@ksairi-org/react-auth-*`.
- **Touchables** — never use `Pressable` or `TouchableOpacity`. Use `@ksairi-org/ui-touchables`.
- **Images** — never use raw `expo-image`. Use `@ksairi-org/expo-image`.
- **Forms** — prefer `@ksairi-org/react-form` field components. Fall back to Tamagui `Input` + `Label` only if a primitive is missing.
- **Screen layout** — use `@ksairi-org/ui-containers` (`Containers.Screen`, `Containers.SubX/Y`, etc.) instead of raw `SafeAreaView` boilerplate.
- **TypeScript utils** — use `@ksairi-org/typescript-functions` (`isDefined`, `typedKeys`, `typedEntries`, `typedValues`) instead of inline equivalents.
- **API hooks** — never import from `@ksairi-org/react-query-sdk` directly in app code. Use the orval-generated hooks in `src/api/generated/`.

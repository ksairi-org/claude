---
name: coding-standards
description: Load coding standards and conventions for this React Native / Expo project. Use when you need guidance on TypeScript patterns, Tamagui tokens, Zustand stores, Lingui i18n, Doppler env vars, or Zustand state ownership rules.
---

Apply the following standards to all code in this project.

## TypeScript

- Never use `any` — use proper types, generics, or type guards
- Never use `as` assertions — fix types at the source
- After any code change, run `tsc --noEmit` and fix **all** errors (zero errors is a baseline)

## React / Components

- Follow React best practices (hooks, memoization, clean component structure)
- Never use `eslint-disable-next-line react-hooks/exhaustive-deps` — fix the dependency issue
- Keep files under **500 lines** — split into sub-components, hooks, or utils proactively

## i18n (Lingui)

- Use `Trans` + `t` for every hardcoded user-visible string
- Use `` t`…` `` for prop strings (placeholders, aria labels, alert titles)
- Import `Trans, useLingui` from `@lingui/react/macro`

## General

- No over-engineering; no magic numbers — extract to named constants
- One `import` statement per module path (prevents `import/no-duplicates`)

## Tamagui

- Main config: `src/theme/tamagui.config.ts`; themes: `src/theme/themes.ts`
- Tokens use kebab-case: `$surface-app`, `$text-primary` — always check `themes.ts` before using
- `allowedStyleValues: "strict"` — only token values; raw hex/rgba will error at compile time
- Spacing/sizing: `$sm`, `$md`, `$lg` from `sizesSpaces`; radius from `radius` tokens
- Never use Tamagui color props with raw strings
- Typography: use components from `src/components/` — no raw `<Text>` with style props
- Never use `StyleSheet.create()` — use Tamagui `styled()`

## Zustand — state ownership

| Layer | Owner |
| --- | --- |
| Server state | react-query / orval hooks |
| Client/UI state | Zustand |

If data comes from the backend it belongs in react-query. Zustand stores should be thin.

### Store pattern

```ts
type MyStore = MyStoreState & MyStoreFunctions;
const INITIAL_STATE: MyStoreState = { ... };
const useMyStore = create<MyStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setKeyValue: (key, value) => set((state) => ({ ...state, [key]: value })),
    }),
    { name: "my-storage", storage: createJSONStorage(() => createZustandMmkvStorage({ id: "my-storage" })) },
  ),
);
```

### Selectors — always select minimally

```ts
// Good
const firstName = useUserStore((state) => state.firstName);
// Bad — re-renders on any store change
const store = useUserStore();
```

## Env Vars / Doppler

- Secrets via Doppler — project and config set in plugin configuration (`/plugin configure expo-rn-plugin`)
- Adding a new secret requires three steps:
  1. Add to `env.template.yaml`: `VAR_NAME={{ .VAR_NAME }}`
  2. Set in all configs: `doppler secrets set VAR_NAME="value" --project <p> --config dev/stg/prod`
  3. Sync: `yarn sync-env-vars stg`
- `EXPO_PUBLIC_` prefix required for client-side vars

## GitHub MCP

Use `mcp__github__*` tools directly:

- PRs: `mcp__github__create_pull_request`
- PR comments: `mcp__github__get_pull_request_comments`
- CI status: `mcp__github__get_pull_request_status`

## HTTP / API

- Use orval-generated hooks for all API calls — never `axios` directly in components
- `axios` only for non-REST endpoints or one-off authenticated file uploads
- Debugging stale queries: open the React Query panel in Expo dev client (`@dev-plugins/react-query`) before touching code

## Lists

- Always use `FlashList` from `@shopify/flash-list` — never `FlatList`
- `estimatedItemSize` is required — omitting it causes a warning and degrades performance

## Dates

- Format dates with `date-fns` — always pass the locale from `expo-localization` for locale-aware output
- Never use `Date.toLocaleDateString()` — output varies by device locale settings

## Unit / Component Tests

- Test runner: `jest-expo`; render helper: `@testing-library/react-native`
- Always wrap renders in a `renderWithProviders` helper that includes Tamagui, query client, and i18n providers
- Assert on what the user sees (`screen.getByText`, `screen.getByRole`) — never on internal state
- Run `/test` skill for canonical test patterns and provider setup

## E2E Tests (Maestro)

Flows in `.maestro/`. Run: `maestro test .maestro/<flow>.yaml`
Text matchers preferred over testIDs.

## OTA Updates

```bash
eas update --channel production --message "description"
```

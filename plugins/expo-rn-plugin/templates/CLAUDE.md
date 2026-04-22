# Project Name

## Code Quality Standards

### TypeScript

- Never use `any` type — use proper TypeScript types instead
- Never use `as` type assertions — always fix the types at the source (e.g. extend type definitions, use proper generics, narrow with type guards)
- After any code change, run `tsc --noEmit` and fix **all** errors before presenting results — zero TS errors is a baseline

### React / Components

- Follow React best practices (proper hooks usage, memoization where appropriate, clean component structure)
- Never use `eslint-disable-next-line react-hooks/exhaustive-deps` — fix the dependency issue at the source (e.g. extract stable setter references, use refs, stabilize callbacks)
- Keep files under **500 lines** — when a file approaches this limit, proactively split into sub-components, custom hooks, or utility modules

### i18n (Lingui)

- Use `Trans` component + `t` tag for every hardcoded user-visible string — no raw string literals in JSX
- Use `` t`…` `` for prop strings (placeholders, aria labels, alert titles, etc.)
- Import `Trans, useLingui` from `@lingui/react/macro`

### Package Manager

- Always use `yarn` — never `npm`, `npx`, or `pnpm`
- Run scripts with `yarn <script>`, install with `yarn add`, execute one-off packages with `yarn dlx <package>`

### General

- Keep solutions simple and focused — no over-engineering
- Never leave magic numbers or magic strings inline — extract to a named constant; local to one file → top of file, shared → `constants/`
- Never split imports from the same module across multiple `import` statements — consolidate into one line per module path (prevents `import/no-duplicates` ESLint errors)

---

## Project Context

<!-- Describe the stack, key services, and architectural decisions here -->

- React Native / Expo app
- Database with `api` schema (not public)
- Expo Router for navigation
- Component patterns in `src/components/`

## Conventions

- Always use TypeScript strict mode
- Queries go through react-query hooks
- Auth handled via `useAuthStore`

---

## Tamagui

- Main config (tokens, themes, fonts): `src/theme/tamagui.config.ts`
- Theme tokens use kebab-case with semantic names: `$surface-app`, `$background-brand`, `$text-primary`, etc. — always check `src/theme/themes.ts` for valid token names before using one
- `allowedStyleValues: "strict"` is set — only design token values are accepted, raw hex/rgba strings will error at compile time
- For spacing and sizing use `$sm`, `$md`, `$lg` etc. from `sizesSpaces`; for radius use `$sm`, `$md` etc. from `radius` — check `src/theme/tokens/` for the actual scale
- Do NOT use Tamagui's built-in `Stack`/`XStack`/`YStack` color props with raw strings — always use a `$token` reference
- Typography components live in `src/components/` — use those instead of raw `<Text>` with style props
- Never use `StyleSheet.create()` — use Tamagui's `styled()` function to create styled components that inherit the design token system

---

## Zustand

### State ownership — the hard rule

| Layer | Owner | Examples |
| --- | --- | --- |
| **Server state** | react-query / orval hooks | user profile, transactions, balances |
| **Client/UI state** | Zustand | auth session, onboarding flags, ephemeral UI state |

If data comes from or syncs to the backend, it belongs in react-query. Zustand stores should be thin.

### Store structure

Every store follows this pattern:

```ts
type MyStoreState = { ... };
type MyStoreFunctions = { setKeyValue: <K extends keyof MyStoreState>(key: K, value: MyStoreState[K]) => void; };
type MyStore = MyStoreState & MyStoreFunctions;

const INITIAL_STATE: MyStoreState = { ... };

const useMyStore = create<MyStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setKeyValue: (key, value) => set((state) => ({ ...state, [key]: value })),
    }),
    {
      name: "my-storage",
      storage: createJSONStorage(() => createZustandMmkvStorage({ id: "my-storage" })),
    },
  ),
);
```

- `INITIAL_STATE` defined separately — makes resets trivial
- Storage uses MMKV via `createZustandMmkvStorage` from `src/stores/utils.ts`
- `name` (storage key) and `id` (MMKV instance) must match

### Selectors — always select minimally

```ts
// Good
const firstName = useUserStore((state) => state.firstName);
// Bad — re-renders on any store change
const store = useUserStore();
```

### What does NOT belong in Zustand

- Data fetched from the backend — use react-query hooks
- Derived/computed values — derive in the component
- Loading/error states for network requests — react-query owns those

---

## Env Vars / Doppler

- Secrets managed via Doppler — project and config set via `/plugin configure expo-rn-plugin`
- To add a new secret, follow all three steps in order:

  1. Add the var name to `env.template.yaml`:

     ```yaml
     VAR_NAME={{ .VAR_NAME }}
     ```

  2. Set it in all Doppler configs:

     ```bash
     doppler secrets set VAR_NAME="value" --project <project> --config dev
     doppler secrets set VAR_NAME="value" --project <project> --config stg
     doppler secrets set VAR_NAME="value" --project <project> --config prod
     ```

  3. Sync to local `.env`:

     ```bash
     yarn sync-env-vars stg
     ```

- `EXPO_PUBLIC_` prefix required for vars accessed in client-side code

---

## GitHub MCP

Use `mcp__github__*` tools directly instead of switching to terminal for GitHub tasks:

- Creating PRs: `mcp__github__create_pull_request`
- Reviewing PR comments: `mcp__github__get_pull_request_comments`
- Checking CI status: `mcp__github__get_pull_request_status`
- Opening issues: `mcp__github__create_issue`

---

## E2E Tests (Maestro)

Flows live in `.maestro/`. Run with:

```bash
maestro test .maestro/<flow>.yaml
```

- Add new flows for any critical user path (auth, payments)
- Text matchers are preferred over testIDs for resilience

---

## OTA Updates

Push an OTA update:

```bash
eas update --channel production --message "description"
```

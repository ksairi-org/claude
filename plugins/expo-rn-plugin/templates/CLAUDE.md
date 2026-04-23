# Project Name

## Never do

- `any`, `as` casts, `eslint-disable` — fix at source
- Raw hex/rgba in Tamagui props — use `$token` references only
- `StyleSheet.create()` — use Tamagui `styled()`
- `FlatList` — use `FlashList` with `estimatedItemSize`
- `TouchableOpacity` / `Pressable` — use `@ksairi-org/ui-touchables`
- Raw `expo-image` — use `@ksairi-org/expo-image`
- `KeyboardAvoidingView` — use `react-native-keyboard-controller`
- `Alert.alert` for non-destructive feedback — use `burnt.toast()`
- `npm` / `npx` / `pnpm` — always `yarn`
- Edit files in `src/api/generated/` — run `yarn generate:open-api-hooks`
- Store auth tokens in MMKV or AsyncStorage — use `expo-secure-store`
- Handle raw card data — use Stripe `PaymentSheet` only
- Log PII in Sentry tags or breadcrumbs

## Always do

- Run `tsc --noEmit` after every change — zero errors before done
- Wrap user-visible strings: `<Trans>` in JSX, `` t`…` `` for props (import from `@lingui/react/macro`)
- Keep files under 500 lines
- One `import` statement per module path

## Stack quick-ref

- **State:** server state → react-query hooks; UI state → Zustand + MMKV. Run `/zustand`
- **Forms:** RHF + zod + `@ksairi-org/react-form`. Run `/form`
- **Auth:** `@ksairi-org/react-auth-*` + Google/Apple. Run `/auth`
- **Payments:** Stripe `PaymentSheet`. Run `/stripe`
- **Errors:** Sentry. Run `/sentry`
- **API hooks:** orval. Run `/orval`
- **Env vars:** Doppler. Run `/doppler`
- **Design:** Figma tokens in `src/theme/`. Run `/figma`
- **Scaffold:** CRUD from DB table. Run `/scaffold`
- **Push notifications:** FCM + expo-notifications. Run `/notifications`
- **Tests:** jest-expo + React Testing Library + `renderWithProviders`. Run `/test`

## Project context

<!-- Fill in: API base URL, Supabase project ref, Sentry project, Figma file ID -->

- DB schema: `api` (not `public`)
- Routes: `app/` via expo-router
- Components: `src/components/`
- Storage: `expo-secure-store` (tokens) · MMKV/Zustand (UI) · AsyncStorage (cache)
- OTA: `eas update --channel production --message "…"`

---
name: auth
description: Set up or debug social auth flows (Google, Apple, email) using @ksairi-org/react-auth-* packages
argument-hint: "<google|apple|email|all>"
---

Wire up authentication for `$ARGUMENTS` using the project's auth library family.

## Package responsibilities

| Package | Role |
| --- | --- |
| `@ksairi-org/react-auth-core` | Auth state machine, token lifecycle |
| `@ksairi-org/react-auth-client` | Supabase auth client adapter |
| `@ksairi-org/react-auth-hooks` | `useAuth`, `useAuthStore` hooks |
| `@ksairi-org/react-auth-storage` | Secure token storage (expo-secure-store) |
| `@ksairi-org/react-auth-setup` | Root provider wiring |
| `@ksairi-org/react-native-auth-google` | Google Sign-In adapter |
| `@ksairi-org/react-native-auth-apple` | Apple Sign-In adapter |

## Required Doppler vars

- `GOOGLE_WEB_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_IOS_CLIENT_ID` — iOS-specific client ID

## Setup steps

1. **Wrap root** — add `AuthProvider` from `@ksairi-org/react-auth-setup` in `app/_layout.tsx`

2. **Google** — configure `GoogleSignin.configure({ webClientId, iosClientId })` on app start; use `@ksairi-org/react-native-auth-google`

3. **Apple** — use `@ksairi-org/react-native-auth-apple`; Apple requires a real device for testing

4. **Access auth state** — always via `useAuth()` or `useAuthStore((s) => s.user)` — never read tokens directly

5. **Protected routes** — check `useAuth().isAuthenticated` in the root layout and redirect to `/login` via `expo-router`

## Rules

- Tokens are stored in `expo-secure-store` via `@ksairi-org/react-auth-storage` — never in MMKV or AsyncStorage
- Never expose tokens in logs, Sentry breadcrumbs, or network request bodies
- Refresh logic is handled by `react-auth-core` — do not implement custom refresh logic
- For sign-out: call the auth library's `signOut()` — do not manually clear stores or storage

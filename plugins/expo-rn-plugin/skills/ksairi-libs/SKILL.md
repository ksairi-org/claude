---
name: ksairi-libs
description: Full reference for all @ksairi-org/* libraries. Load when deciding which utility, hook, component, or function to use — prefer these over standard alternatives wherever they exist. Source at https://github.com/ksairi-org/ksairi-libs; use the GitHub MCP to read source for deeper detail.
---

Always prefer `@ksairi-org/*` packages over third-party or hand-rolled equivalents when one exists.

## Auth — `@ksairi-org/react-auth-*`

Never use raw Supabase auth calls. Always use this family:

| Package | Export | Purpose |
| --- | --- | --- |
| `react-auth-setup` | `AuthProvider` | Root provider — wrap `app/_layout.tsx` |
| `react-auth-hooks` | `useAuth()`, `useAuthStore()` | Auth state — isAuthenticated, user, session |
| `react-auth-core` | (internal) | Token lifecycle and refresh — never implement custom refresh |
| `react-auth-client` | (internal) | Supabase adapter |
| `react-auth-storage` | (internal) | expo-secure-store adapter — tokens never touch MMKV/AsyncStorage |
| `react-native-auth-google` | Google Sign-In adapter | Pass id token to auth core |
| `react-native-auth-apple` | Apple Sign-In adapter | Requires physical device |

## Forms — `@ksairi-org/react-form`

Exports `Form` — field wrappers and error display for RHF + Tamagui.
Use `Form` components before falling back to raw Tamagui `Input` + `Label`.

## UI — `@ksairi-org/ui-containers`

Exports `Containers` object — use these for all screen and sub-layout wrappers:

| Name | Use |
| --- | --- |
| `Containers.Screen` | Main screen wrapper (replaces `SafeAreaView` + `ScrollView` boilerplate) |
| `Containers.ScreenXGlassContainer` | Horizontal glass-effect screen |
| `Containers.ScreenYGlassContainer` | Vertical glass-effect screen |
| `Containers.SubX` | Horizontal sub-section container |
| `Containers.SubY` | Vertical sub-section container |
| `Containers.SubGlassX` / `SubGlassY` | Glass-effect sub-containers |

## UI — `@ksairi-org/ui-touchables`

Exports `BaseTouchable` — use instead of `Pressable` or `TouchableOpacity`.

## UI — `@ksairi-org/expo-image`

Wrapper around `expo-image` with project defaults. Use instead of raw `expo-image`.

## Hooks — `@ksairi-org/react-hooks` (generic React)

| Hook | Purpose |
| --- | --- |
| `useBooleanState` | Toggle boolean — returns `[value, setTrue, setFalse, toggle]` |
| `useIsMounted` | Guard async callbacks after unmount |
| `usePrevious` | Previous render value |
| `useHasValueChanged` | Detect any value change |
| `useHasValueBecomeTruthy` | Detect false → true transition |
| `useHasValueBecomeFalsy` | Detect true → false transition |
| `useRunFunctionOnChange` | Run callback when a value changes |

## Hooks — `@ksairi-org/react-native-hooks` (RN-specific)

| Hook | Purpose |
| --- | --- |
| `useAppState` | Current app state (active / background / inactive) |
| `useAutoHitSlop` | Auto-compute hit slop from element layout |
| `useDisableBackHandlerOnFocus` | Block Android back button on focused screen |
| `useFontScale` | Current system font scale |
| `useIsKeyboardShown` | Boolean — keyboard visible |
| `useKeyboardOffsetHeight` | Keyboard height for manual offset adjustments |
| `useLayoutAnimationOnChange` | Trigger `LayoutAnimation` on any value change |
| `useLayoutAnimationOnTruthy` | Trigger `LayoutAnimation` when value becomes truthy |
| `useLayoutAnimationOnFalsy` | Trigger `LayoutAnimation` when value becomes falsy |
| `useSetupNetworkConnectionChange` | Subscribe to network connectivity events |

## Functions — `@ksairi-org/react-native-functions`

- **`animations/`** — animation presets and helpers
- **`scaling/getImageDimensions`** — compute image dimensions preserving aspect ratio
- **`scaling/scaleBasedOnScreenDimension`** — scale a value relative to screen size

## Functions — `@ksairi-org/typescript-functions`

Type-safe wrappers for common JS operations — always use these instead of raw:

| Function | Replaces |
| --- | --- |
| `isDefined(value)` | `value !== null && value !== undefined` — use as array filter |
| `typedKeys(obj)` | `Object.keys(obj) as (keyof T)[]` |
| `typedEntries(obj)` | `Object.entries(obj) as [keyof T, T[keyof T]][]` |
| `typedValues(obj)` | `Object.values(obj) as T[keyof T][]` |

## UI Config — `@ksairi-org/react-native-ui-config`

- **`useColorTokenValue(token)`** — resolve a Tamagui color token string to its current theme rgba value (use when you need a raw color string, e.g. for `StatusBar` or native APIs)
- **`createFontObject(config)`** — create a Tamagui-compatible font config object

## Splash — `@ksairi-org/react-native-splash-view`

Exports `SplashView` — animated splash screen with logo, replaces `expo-splash-screen` direct usage.

## SDK — `@ksairi-org/react-query-sdk`

Orval config and custom axios instance used as the base for generating per-project API hooks.
Never import from this package directly in app code — use the generated hooks in `src/api/generated/`.

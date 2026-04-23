---
name: test
description: Write or fix component and hook tests using @testing-library/react-native and jest-expo. Use when adding new screens, hooks, or form logic, or when a test is failing.
argument-hint: "<file_or_feature_to_test>"
---

Write tests for `$ARGUMENTS` following project conventions.

## Stack

- `jest-expo` — Jest preset with Expo module mocks
- `@testing-library/react-native` — render and query helpers
- `react-test-renderer` — underlying renderer

## Provider wrapper

Every render needs Tamagui, react-query, and Lingui. Create once in `src/test-utils/renderWithProviders.tsx`:

```tsx
import { render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import config from "src/theme/tamagui.config";

export function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TamaguiProvider config={config} defaultTheme="light">
        <I18nProvider i18n={i18n}>{ui}</I18nProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
```

## Patterns

### Component test

```tsx
it("shows error when email is empty", async () => {
  const { getByRole, getByText } = renderWithProviders(<LoginForm />);
  fireEvent.press(getByRole("button", { name: /submit/i }));
  await waitFor(() => expect(getByText(/required/i)).toBeTruthy());
});
```

### Hook test

```tsx
import { renderHook, waitFor } from "@testing-library/react-native";

it("returns wallet balance", async () => {
  const { result } = renderHook(() => useWallet(), { wrapper: Providers });
  await waitFor(() => expect(result.current.data).toBeDefined());
});
```

### Mocking react-query hooks

```ts
jest.mock("src/api/generated", () => ({
  useGetWallets: () => ({ data: [{ id: "1", balance: 100 }], isLoading: false }),
}));
```

## Rules

- Always use `renderWithProviders` — never bare `render`
- Assert on visible output (`getByText`, `getByRole`, `getByLabelText`) — never on component state
- Never test implementation details — test user-observable behaviour
- `retry: false` on QueryClient prevents async retries in tests
- For navigation: mock `expo-router` with `jest.mock("expo-router")`
- Run `tsc --noEmit` after writing tests — type errors in tests count

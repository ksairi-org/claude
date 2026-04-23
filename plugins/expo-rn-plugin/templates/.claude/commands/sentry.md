---
name: sentry
description: Sentry error monitoring — setup, capture patterns, and release management via Sentry MCP
---

Use the Sentry MCP (`mcp__sentry__*`) to query production errors, releases, and performance data.

## Setup checklist

- `SENTRY_DSN` in Doppler → `.env` as `EXPO_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN` in Doppler (for source map uploads during EAS builds)
- `SENTRY_ORG` and `SENTRY_PROJECT` set in the plugin configuration

## Canonical initialisation

```ts
// app/_layout.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV, // "stg" | "prod"
  tracesSampleRate: __DEV__ ? 0 : 0.2,
});

export default Sentry.wrap(RootLayout);
```

## Capture patterns

```ts
// Unexpected error with context
Sentry.withScope((scope) => {
  scope.setTag("feature", "payments");
  scope.setUser({ id: userId });
  Sentry.captureException(error);
});

// Non-fatal event
Sentry.captureMessage("Stripe webhook retry", "warning");

// Breadcrumb for manual tracing
Sentry.addBreadcrumb({ message: "User tapped checkout", category: "ui" });
```

## Error boundary

```tsx
import * as Sentry from "@sentry/react-native";

export const ErrorBoundary = Sentry.ErrorBoundary;
// Wrap screen roots — not every leaf component
```

## MCP usage

- `mcp__sentry__list_issues` — surface recent production errors
- `mcp__sentry__get_issue` — inspect a specific error with stack trace
- `mcp__sentry__list_releases` — check which version is deployed

## Rules

- Always call `Sentry.wrap()` on the root layout — not individual screens
- Set `environment` from Doppler so stg errors don't pollute prod
- Never log PII (emails, card numbers) in scope tags or breadcrumbs
- Source maps: configured via `SENTRY_AUTH_TOKEN` in EAS build environment

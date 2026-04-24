---
name: analytics
description: Load analytics standards for this React Native / Expo project. Covers event naming, user identification, screen tracking, and privacy rules. Default provider is Firebase Analytics; PostHog and Amplitude are supported alternatives.
---

Apply the following analytics standards to all code in this project.

## Provider

**Default: Firebase Analytics** (`@react-native-firebase/analytics`) — already in the Firebase MCP stack.

Alternatives:

| Provider | Package | When to prefer |
| --- | --- | --- |
| Firebase Analytics | `@react-native-firebase/analytics` | Default — integrates with existing Firebase setup |
| PostHog | `posthog-react-native` | Product analytics, feature flags, session replay |
| Amplitude | `@amplitude/analytics-react-native` | Enterprise, cohort analysis, behavioral funnels |

## Abstraction layer (required)

Never call the provider SDK directly in components. Always go through a central `src/analytics/index.ts`:

```ts
// src/analytics/index.ts
import analytics from '@react-native-firebase/analytics';

export const Analytics = {
  identify: (userId: string) => analytics().setUserId(userId),
  reset: () => analytics().setUserId(null),
  screen: (name: string) => analytics().logScreenView({ screen_name: name, screen_class: name }),
  track: (event: string, params?: Record<string, string | number | boolean>) =>
    analytics().logEvent(event, params),
};
```

This lets you swap providers without touching call sites.

## Event naming

- Use `snake_case` for all event names: `item_purchased`, `form_submitted`, `onboarding_completed`
- Prefix with the domain when ambiguous: `auth_login_success`, `payment_sheet_opened`
- Past tense for completed actions, present tense for states: `profile_updated`, `push_enabled`
- Never use spaces or special characters

## Screen tracking

Wire to the Expo Router navigation state — do not call `Analytics.screen()` manually in each screen:

```ts
// app/_layout.tsx
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Analytics } from '@/analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => { Analytics.screen(pathname); }, [pathname]);
  return <>{children}</>;
}
```

## User identification

```ts
// After successful sign-in
Analytics.identify(user.id);

// On sign-out
Analytics.reset();
```

Never identify before auth completes. Clear on sign-out.

## Privacy rules (non-negotiable)

- Never log PII in event properties: no names, emails, phone numbers, addresses, or DOBs
- Never log raw payment data: no card numbers, CVVs, or full PANs
- Never log auth tokens or session IDs
- User IDs passed to `identify()` must be your internal opaque ID (UUID) — not email or phone
- Sentry and Analytics are separate: do not cross-log breadcrumbs that contain user-identifiable info

## Switching providers

If the project uses PostHog or Amplitude instead of Firebase, ask for the relevant implementation pattern and it will be provided on demand.

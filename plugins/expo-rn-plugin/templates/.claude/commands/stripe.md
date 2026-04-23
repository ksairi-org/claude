---
name: stripe
description: Stripe payments — PaymentSheet setup, Doppler vars, and Stripe MCP usage
---

Use the Stripe MCP (`mcp__stripe__*`) to inspect payment intents, customers, and webhook events.

## Required Doppler vars

| Var | Scope | Notes |
|---|---|---|
| `STRIPE_PUBLISHABLE_KEY` | client (`EXPO_PUBLIC_`) | Safe to expose in app bundle |
| `STRIPE_SECRET_KEY` | server only | Never in the app — Supabase Edge Function only |
| `STRIPE_WEBHOOK_SECRET` | server only | For webhook signature verification |

## PCI rules — non-negotiable

- **Never handle raw card data** in the app — use `PaymentSheet` exclusively
- **Never log** card numbers, CVVs, or full PANs anywhere
- **Never store** payment method details in Zustand or AsyncStorage
- The Stripe secret key lives in a Supabase Edge Function, accessed via Doppler

## Canonical PaymentSheet flow

```ts
// 1. App requests a PaymentIntent from your Supabase Edge Function
const { clientSecret } = await createPaymentIntent({ amount, currency });

// 2. Initialise StripeProvider at app root (app/_layout.tsx)
<StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
  <Slot />
</StripeProvider>

// 3. Present PaymentSheet
import { useStripe } from "@stripe/stripe-react-native";

const { initPaymentSheet, presentPaymentSheet } = useStripe();

await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: "Virtual Wallet" });
const { error } = await presentPaymentSheet();
```

## Edge Function (server-side)

```ts
// supabase/functions/create-payment-intent/index.ts
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const intent = await stripe.paymentIntents.create({ amount, currency: "usd" });
return new Response(JSON.stringify({ clientSecret: intent.client_secret }));
```

## MCP usage

- `mcp__stripe__list_payment_intents` — inspect recent transactions
- `mcp__stripe__retrieve_customer` — look up a customer's payment methods
- `mcp__stripe__list_events` — debug webhook delivery

## Rules

- Always verify webhook signatures using `STRIPE_WEBHOOK_SECRET` in the Edge Function
- Use `presentPaymentSheet` result to determine success — do not poll the backend
- Test with Stripe test card `4242 4242 4242 4242` in stg environment
- Run `tsc --noEmit` after any payment flow change

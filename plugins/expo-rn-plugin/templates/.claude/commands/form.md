---
name: form
description: Generate a type-safe form using react-hook-form + zod + Tamagui
argument-hint: "<zod_schema_or_description>"
---

Generate a validated form for `$ARGUMENTS` using the project's form stack.

## Stack

- `@ksairi-org/react-form` — project form primitives (field wrappers, error display)
- `react-hook-form` — form state and submission
- `@hookform/resolvers/zod` — zod resolver bridge
- `zod` — schema and validation rules
- Tamagui — layout and styled inputs

## Steps

1. **Define the schema** — write a `zod` object schema with all fields; derive the TypeScript type with `z.infer`

2. **Wire the form** — use `useForm<FormType>` with `zodResolver(schema)` and sensible `defaultValues`

3. **Render fields** — use field components from `@ksairi-org/react-form`; fall back to Tamagui `Input` + `Label` only if a primitive is missing

4. **Handle submission** — `handleSubmit(onSubmit)` where `onSubmit` receives the fully-typed, validated payload

5. **i18n** — every label, placeholder, and error message wrapped with `Trans` / `` t`…` ``

6. **Type-check** — run `tsc --noEmit` and fix all errors before reporting done

## Canonical pattern

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
});

type FormValues = z.infer<typeof schema>;

export function MyForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", amount: 0 },
  });

  return (
    <YStack gap="$md">
      <Controller
        control={control}
        name="email"
        render={({ field }) => <FormField label={t`Email`} error={errors.email} {...field} />}
      />
      <Button onPress={handleSubmit(onSubmit)}><Trans>Submit</Trans></Button>
    </YStack>
  );
}
```

## Rules

- Schema lives in a separate `<feature>.schema.ts` file when shared across screens
- Never use `register` — always `Controller` for React Native compatibility
- Never suppress zod errors with `.optional()` to silence TS — fix the type
- `defaultValues` must cover every field to avoid uncontrolled → controlled warnings
- For async server errors, use `setError("root", { message: ... })`

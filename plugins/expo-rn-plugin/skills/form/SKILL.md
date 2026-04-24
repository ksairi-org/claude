---
name: form
description: Generate a type-safe form from a zod schema using react-hook-form, @hookform/resolvers, and Tamagui field components. Use when building any user input form — login, registration, payments, profile edits.
argument-hint: "<feature_or_schema_description>"
---

Generate a validated form for `$ARGUMENTS`.

## Steps

1. **Check existing components** — call `get_components` and look for existing form field primitives before creating new ones

2. **Define the zod schema** — write a `z.object()` schema in a dedicated `<feature>.schema.ts` file; derive the TypeScript type with `z.infer`

3. **Wire the form** — use `useForm<FormValues>` with `zodResolver(schema)` and explicit `defaultValues` for every field

4. **Render with Controller** — always use `Controller` (never `register`) for React Native compatibility; use project form field components or Tamagui `Input` + `Label` as fallback

5. **Handle submission** — `handleSubmit(onSubmit)` where `onSubmit` receives the fully-typed payload; use `setError("root", ...)` for server-returned errors

6. **i18n** — every label, placeholder, and error string wrapped with `Trans` / `` t`…` ``

7. **Type-check** — run `tsc --noEmit` and fix all errors before reporting done

## Canonical output shape

```ts
// <feature>.schema.ts
import { z } from "zod";
export const mySchema = z.object({ ... });
export type MyFormValues = z.infer<typeof mySchema>;

// <Feature>Form.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { mySchema, type MyFormValues } from "./<feature>.schema";

export function MyForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLingui();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<MyFormValues>({
    resolver: zodResolver(mySchema),
    defaultValues: { ... },
  });

  const onSubmit = async (data: MyFormValues) => { ... };

  return (
    <YStack gap="$md">
      <Controller
        control={control}
        name="fieldName"
        render={({ field }) => (
          <FormField label={t`Label`} error={errors.fieldName} {...field} />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        <Trans>Submit</Trans>
      </Button>
    </YStack>
  );
}
```

## Rules

- Schema in a separate file when reused across screens
- `defaultValues` must cover every field — no uncontrolled → controlled warnings
- Never use `.optional()` to silence TS errors — fix the type at the source
- Never suppress `react-hooks/exhaustive-deps` — fix the dependency
- Run `tsc --noEmit` after generation; zero errors before reporting done

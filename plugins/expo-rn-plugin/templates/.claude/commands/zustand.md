---
name: zustand
description: Show the canonical Zustand store pattern for this project
---

Every store follows this exact structure:

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

## Rules

- `INITIAL_STATE` defined separately — makes resets trivial
- Storage: MMKV via `createZustandMmkvStorage` from `src/stores/utils.ts`
- `name` (storage key) and `id` (MMKV instance) must match
- Selectors: always select minimally — `useMyStore((s) => s.field)`, never `useMyStore()`
- Never store backend data here — use react-query hooks
- Never store derived values — compute in the component

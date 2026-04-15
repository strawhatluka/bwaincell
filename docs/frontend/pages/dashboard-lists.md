# Dashboard Lists Page

**Source:** `frontend/app/dashboard/lists/page.tsx`
**Route:** `/dashboard/lists`

Client component.

## Composition

```tsx
<ErrorBoundary>
  <div>
    <h1>Lists</h1>
    <p>Create and manage your custom lists</p>
    <ListGrid />
  </div>
</ErrorBoundary>
```

## Dependencies

- `ListGrid` from `@/components/lists/ListGrid` — uses `useLists()`.
- `ErrorBoundary` from `@/components/common/ErrorBoundary`.

## Data Loading

Delegated entirely to `ListGrid` + `useLists`.

## State / Hooks

None at this level.

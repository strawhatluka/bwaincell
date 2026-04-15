# ErrorBoundary

**Source:** `frontend/components/common/ErrorBoundary.tsx`

Class-based React error boundary. Used to wrap each dashboard page.

## Props

| Name       | Type        | Required | Description       |
| ---------- | ----------- | -------- | ----------------- |
| `children` | `ReactNode` | yes      | Subtree to guard. |

## State

```ts
interface State {
  hasError: boolean;
  error: Error | null;
}
```

## Lifecycle

- `static getDerivedStateFromError(error)` — returns `{ hasError: true, error }`.
- `componentDidCatch(error, errorInfo)` — `console.error('Error caught by boundary:', error, errorInfo)`.

## Fallback UI

Centered `AlertTriangle` icon + `"Something went wrong"` heading + muted description + `"Try Again"` button that resets state via `setState({ hasError: false, error: null })`.

## Dependencies

- React `Component`.
- `Button` from `@/components/ui/button`.
- lucide: `AlertTriangle`.

## Integration

Wraps the root `<div>` of every `app/dashboard/*/page.tsx`. Not wired to an error-reporting service.

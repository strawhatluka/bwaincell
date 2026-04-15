# Dashboard Reminders Page

**Source:** `frontend/app/dashboard/reminders/page.tsx`
**Route:** `/dashboard/reminders`

Client component.

## Composition

```tsx
<ErrorBoundary>
  <div>
    <h1>Reminders</h1>
    <p>Never forget important events and deadlines</p>
    <ReminderList />
  </div>
</ErrorBoundary>
```

## Dependencies

- `ReminderList` from `@/components/reminders/ReminderList` — uses `useReminders()`.
- `ErrorBoundary` from `@/components/common/ErrorBoundary`.

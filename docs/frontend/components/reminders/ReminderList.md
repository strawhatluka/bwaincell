# ReminderList

**Source:** `frontend/components/reminders/ReminderList.tsx`

Top-level reminders view. Lists reminders or shows an empty-state prompting users to use the Discord `/remind` command.

## Props

None.

## Hooks

`useReminders()` — `{ reminders, isLoading, deleteReminder }`. No create mutation — reminders are authored via Discord.

## Rendering

- `isLoading` → `<ReminderListSkeleton />`.
- Empty: centered `Bell` + `MessageSquare` + code snippet `/remind` hint.
- Otherwise: `space-y-3` stack of `<ReminderItem>`, each receiving `onDelete={deleteReminder}`.

## Dependencies

- `ReminderItem`, `ReminderListSkeleton`.
- lucide: `Bell`, `MessageSquare`.

## Integration

Rendered by `app/dashboard/reminders/page.tsx` inside `ErrorBoundary`.

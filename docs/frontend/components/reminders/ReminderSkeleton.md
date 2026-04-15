# ReminderSkeleton / ReminderListSkeleton

**Source:** `frontend/components/reminders/ReminderSkeleton.tsx`

Loading placeholders for `ReminderList`.

## `ReminderSkeleton`

Single row placeholder: title bar (3/4 width), icon + label bar, and a 9×9 action button skeleton.

## `ReminderListSkeleton`

Five `ReminderSkeleton`s stacked with `space-y-3`. Used by `ReminderList` while `useReminders().isLoading`.

## Props

None.

## Dependencies

- `Skeleton` from `@/components/ui/skeleton`.

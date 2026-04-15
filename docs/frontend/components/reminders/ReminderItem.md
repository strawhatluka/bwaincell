# ReminderItem

**Source:** `frontend/components/reminders/ReminderItem.tsx`

Renders one reminder row with type badge, next-trigger time, and a delete action.

## Props

| Name       | Type                   | Required | Description                                   |
| ---------- | ---------------------- | -------- | --------------------------------------------- |
| `reminder` | `Reminder`             | yes      | See shape below.                              |
| `onDelete` | `(id: number) => void` | yes      | Called after user confirms the delete dialog. |

### `Reminder`

```ts
interface Reminder {
  id: number;
  userId: string;
  guildId: string;
  message: string;
  frequency: 'once' | 'daily' | 'weekly';
  time: string;
  dayOfWeek?: number;
  nextTrigger: string; // ISO
  createdAt?: string;
  updatedAt?: string;
}
```

## Type Display

```ts
function getTypeDisplay() {
  if (frequency === 'once') return 'One-time';
  if (frequency === 'daily') return 'Daily';
  if (frequency === 'weekly' && dayOfWeek !== undefined) return `Weekly (${DAYS[dayOfWeek]})`;
  return 'Weekly';
}
```

Badge colors: `once` → blue, `daily` → green, `weekly` → purple.

## Rendering

- Left icon chip: `Bell` on a dawn-tinted background.
- Message + delete button on the right.
- Bottom row: type `Badge`, `Clock` icon with `"at {h:mm a}"` derived from `nextTrigger`.
- Footer: `"Next: {MMM d, yyyy 'at' h:mm a}"`.

## Local State

`isDeleteOpen: boolean` controls the delete confirmation dialog.

## Dependencies

- `date-fns` (`format`, `parseISO`).
- shadcn: `Button`, `Badge`, `Dialog*`.
- lucide: `Trash2`, `Bell`, `Clock`.

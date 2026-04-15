# ReminderCreateForm

**Source:** `frontend/components/reminders/ReminderCreateForm.tsx`

Dialog-triggered form for creating one-time / daily / weekly reminders. **Not currently wired** to a mutation — `useReminders` does not yet expose `createReminder`; reminders are authored via Discord `/remind`. The component nevertheless exists for future use and can be mounted by any page passing `onCreate` + `isCreating`.

## Props

| Name         | Type                                                                                                              | Required | Description                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| `onCreate`   | `(data: { message: string; frequency: 'once' \| 'daily' \| 'weekly'; time: string; dayOfWeek?: number }) => void` | yes      | Invoked on valid submit.                             |
| `isCreating` | `boolean`                                                                                                         | yes      | Disables inputs and flips button to `"Creating..."`. |

## Constants

`DAYS = [{value: 0, label: 'Sunday'}, ..., {value: 6, label: 'Saturday'}]`.

## Local State

- `isOpen: boolean`
- `message: string`
- `frequency: 'once' | 'daily' | 'weekly'` (default `'once'`)
- `time: string` (default `'09:00'`)
- `dayOfWeek: number` (default `1` Monday)

## Behavior

- `dayOfWeek` `Select` renders only when `frequency === 'weekly'`; the `dayOfWeek` is omitted from the payload otherwise.
- Submit validates `message.trim()` and `time`.

## Dependencies

- shadcn: `Dialog*`, `Button`, `Input`, `Label`, `Select*`.
- lucide: `Plus`.

# TaskItem

**Source:** `frontend/components/tasks/TaskItem.tsx`

Renders one task with toggle/edit/delete. Includes inline edit dialog and delete-confirmation dialog.

## Props

| Name       | Type                                        | Required | Description                                                                                 |
| ---------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `task`     | `Task`                                      | yes      | See shape below.                                                                            |
| `onUpdate` | `(id: number, data: Partial<Task>) => void` | yes      | Called with `{ completed }` on checkbox toggle and `{ description, dueDate }` on edit save. |
| `onDelete` | `(id: number) => void`                      | yes      | Called after the user confirms in the delete dialog.                                        |

### `Task`

```ts
interface Task {
  id: number;
  userId: string;
  guildId: string;
  description: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Local State

```ts
const [isEditOpen, setIsEditOpen] = useState(false);
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [description, setDescription] = useState(task.description);
const [dueDate, setDueDate] = useState(parsedDate ? format(parsedDate, 'yyyy-MM-dd') : '');
const [dueTime, setDueTime] = useState(parsedDate ? format(parsedDate, 'HH:mm') : '');
```

## Behavior

- **Toggle complete** — checkbox calls `onUpdate(task.id, { completed: !task.completed })`.
- **Overdue flagging** — `isOverdue = task.dueDate && !task.completed && isPast(parseISO(task.dueDate))`. Renders red `(Overdue)` label and date/time in red.
- **Edit dialog** — combines `dueDate` + `dueTime` into an ISO string the same way as `TaskCreateForm`.
- **Delete dialog** — requires explicit confirmation; `destructive` variant on the confirm button.

## Dependencies

- `date-fns` (`format`, `isPast`, `parseISO`).
- shadcn primitives: `Checkbox`, `Button`, `Dialog*`, `Input`, `Label`.
- `lucide-react` icons: `Pencil`, `Trash2`, `Calendar`, `Clock`.

## Integration

Rendered for every `task` by `TaskList`. `onUpdate` / `onDelete` are wired to `useTasks` mutations.

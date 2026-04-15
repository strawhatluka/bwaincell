# TaskCreateForm

**Source:** `frontend/components/tasks/TaskCreateForm.tsx`

Inline form for creating a new task. Controlled component — owns its own local state, calls `onCreate` on submit.

## Props

| Name         | Type                                                        | Required | Description                                                        |
| ------------ | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `onCreate`   | `(data: { description: string; dueDate?: string }) => void` | yes      | Invoked with trimmed description and optional ISO due-date string. |
| `isCreating` | `boolean`                                                   | yes      | Disables inputs and button, changes label to `"Creating..."`.      |

## Local State

```ts
const [description, setDescription] = useState('');
const [dueDate, setDueDate] = useState('');
const [dueTime, setDueTime] = useState('');
```

## handleSubmit

1. Prevents default.
2. Returns early if `description.trim()` is empty.
3. If `dueDate` is set: builds `new Date(dueDate + 'T' + (dueTime || '00:00') + ':00').toISOString()`.
4. Calls `onCreate({ description: trimmed, dueDate })`.
5. Clears all three local fields.

## Composition

Uses shadcn primitives: `Card`, `Input` (native `date` / `time` types), `Label`, `Button`, plus `Plus` icon from `lucide-react`. Submit button disabled while `isCreating` or description is empty.

## Integration

Rendered by `TaskList` inside [TaskList.md](./TaskList.md); `onCreate` is wired to `useTasks().createTask` via the page.

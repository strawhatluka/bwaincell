# NoteCard

**Source:** `frontend/components/notes/NoteCard.tsx`

Card preview of a single note. Clicking the card opens a view dialog with Edit / Delete actions.

## Props

| Name       | Type                   | Required | Description                                       |
| ---------- | ---------------------- | -------- | ------------------------------------------------- |
| `note`     | `Note`                 | yes      | See shape below.                                  |
| `onEdit`   | `(note: Note) => void` | yes      | Invoked when user clicks Edit in the view dialog. |
| `onDelete` | `(id: number) => void` | yes      | Invoked after user confirms the delete dialog.    |

### `Note`

```ts
interface Note {
  id: number;
  userId: string;
  guildId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Local State

- `isViewOpen: boolean` — opens the view dialog when the card is clicked.
- `isDeleteOpen: boolean` — opens the delete-confirmation dialog.

## Rendering

- Card: title (line-clamp-1), content (line-clamp-3), tags (colored badges), creation date formatted as `MMM d, yyyy`.
- View dialog: full content (`whitespace-pre-wrap`), created-at `MMM d, yyyy 'at' h:mm a`, and footer with Delete + Edit buttons.
- Delete dialog: standard "Are you sure you want to delete ..." prompt, destructive confirm.

## Dependencies

- `date-fns` (`format`, `parseISO`).
- shadcn: `Card`, `Button`, `Badge`, `Dialog*`.
- lucide: `Pencil`, `Trash2`, `FileText`.

## Integration

Rendered by `NoteGrid`; `onEdit` opens `NoteEditor` and `onDelete` calls `useNotes().deleteNote`.

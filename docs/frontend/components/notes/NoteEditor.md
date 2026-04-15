# NoteEditor

**Source:** `frontend/components/notes/NoteEditor.tsx`

Create/edit dialog for notes. Handles title, multiline content, and chip-style tags.

## Props

| Name | Type | Required | Description |
|---|---|---|---|
| `note` | `Note \| null` | no | When provided, pre-fills fields and switches the dialog title to `"Edit Note"`. |
| `isOpen` | `boolean` | yes | Controlled dialog open state. |
| `onClose` | `() => void` | yes | Called from the Dialog's `onOpenChange` handler and Cancel button. |
| `onSave` | `(data: { title: string; content: string; tags: string[] }, noteId?: number) => void` | yes | Invoked on valid submit. When editing, `noteId = note.id`. |
| `isSaving` | `boolean` | yes | Disables inputs / button and flips label to `"Saving..."`. |

## Local State

- `title: string`
- `content: string`
- `tags: string[]`
- `tagInput: string`

`useEffect([note])` pre-fills or resets the fields whenever `note` changes.

## Tag Behavior

- Pressing `Enter` or `,` in the tag input commits the current `tagInput` to `tags` (no duplicates).
- Clicking the `X` inside a tag badge removes it.

## Submit Validation

- `title.trim()` and `content.trim()` must both be truthy.
- If `tagInput.trim()` is non-empty when submitting, the user sees an `alert()` reminding them to confirm or clear the tag before saving.

## Dependencies

- shadcn: `Dialog*`, `Button`, `Input`, `Label`, `Textarea`, `Badge`.
- lucide: `X`.

## Integration

Rendered by `NoteGrid`. `onSave` routes to `useNotes().createNote` (no noteId) or `updateNote({ id, data })`.

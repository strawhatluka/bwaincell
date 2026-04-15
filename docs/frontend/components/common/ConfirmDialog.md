# ConfirmDialog

**Source:** `frontend/components/common/ConfirmDialog.tsx`

Generic destructive-confirmation dialog wrapping shadcn `AlertDialog`.

## Props

| Name | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | yes | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | yes | Passed through to `AlertDialog.onOpenChange`. |
| `title` | `string` | yes | Dialog title. |
| `description` | `string` | yes | Dialog body copy. |
| `onConfirm` | `() => void` | yes | Invoked when the confirm action is clicked. |
| `confirmText` | `string` | no | Defaults to `"Delete"`. |
| `cancelText` | `string` | no | Defaults to `"Cancel"`. |

## Styling

Confirm action uses `bg-red-600 hover:bg-red-700 focus:ring-red-600`.

## Dependencies

- `AlertDialog*` from `@/components/ui/alert-dialog` (shadcn primitive).

## Usage

```tsx
<ConfirmDialog
  open={isLogoutOpen}
  onOpenChange={setIsLogoutOpen}
  title="Log Out"
  description="Are you sure you want to log out?"
  onConfirm={handleLogout}
  confirmText="Log Out"
/>
```

Used by `Header` for logout confirmation.

# EmptyState

**Source:** `frontend/components/common/EmptyState.tsx`

Centered empty-state component with gradient-chip icon, title, description, and optional action button.

## Props

| Name | Type | Required | Description |
|---|---|---|---|
| `icon` | `LucideIcon` | yes | A lucide-react icon component (rendered as `<Icon />`). |
| `title` | `string` | yes | |
| `description` | `string` | yes | |
| `actionLabel` | `string` | no | Renders a `Button` when **both** `actionLabel` and `onAction` are provided. |
| `onAction` | `() => void` | no | Click handler for the action button. |

## Rendering

- 16×16 circular chip with gradient (`from-twilight-100 to-dusk-100`) containing a 8×8 `twilight-600` icon.
- Title (xl semibold), description (muted, max-w-sm).
- Button uses twilight→dusk gradient (`from-twilight-500 to-dusk-500`).

## Dependencies

- `Button` from `@/components/ui/button`.
- `LucideIcon` type from `lucide-react`.

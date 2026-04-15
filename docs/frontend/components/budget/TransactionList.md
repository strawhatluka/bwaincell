# TransactionList

**Source:** `frontend/components/budget/TransactionList.tsx`

Lists transactions sorted by `date` descending, with an inline delete confirmation dialog.

## Props

| Name | Type | Required | Description |
|---|---|---|---|
| `transactions` | `Transaction[]` | yes | Source data. |
| `onDelete` | `(id: number) => void` | yes | Called after confirm in the delete dialog. |

### `Transaction`

```ts
interface Transaction {
  id: number; userId: string; guildId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  createdAt: string; updatedAt: string;
}
```

## Local State

```ts
const [deleteId, setDeleteId] = useState<number | null>(null);
```

## Rendering

- Sorted: `[...transactions].sort((a,b) => new Date(b.date) - new Date(a.date))`.
- Empty state: `"No transactions yet. Add your first transaction!"`.
- Each row:
  - Icon badge: `ArrowUpCircle` (green) for income, `ArrowDownCircle` (red) for expense.
  - Description, signed amount (`+` / `-$` prefix, `.toFixed(2)`), category `Badge`, date formatted as `MMM d, yyyy`.
  - Trash button opens the confirm dialog.

## Dependencies

- `date-fns` (`format`, `parseISO`).
- shadcn primitives: `Button`, `Badge`, `Dialog*`.
- `lucide-react`: `Trash2`, `ArrowUpCircle`, `ArrowDownCircle`.

## Integration

Rendered by `app/dashboard/budget/page.tsx`, wired to `useBudget().deleteTransaction`.

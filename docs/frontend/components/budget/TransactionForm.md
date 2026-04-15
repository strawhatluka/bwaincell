# TransactionForm

**Source:** `frontend/components/budget/TransactionForm.tsx`

Dialog-triggered form for recording a new income or expense transaction.

## Props

| Name | Type | Required | Description |
|---|---|---|---|
| `onCreate` | `(data: { amount: number; type: 'income' \| 'expense'; category: string; description: string; date: string }) => void` | yes | Invoked on valid submit. |
| `isCreating` | `boolean` | yes | Disables all inputs and flips button label to `"Adding..."`. |

## Local State

```ts
const [isOpen, setIsOpen] = useState(false);
const [amount, setAmount] = useState('');
const [type, setType] = useState<'income' | 'expense'>('expense');
const [category, setCategory] = useState('');
const [description, setDescription] = useState('');
const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // today YYYY-MM-DD
```

## Submit

Validates `amount`, `category.trim()`, `description.trim()` all truthy; calls `onCreate({ amount: parseFloat(amount), type, category, description, date })`; resets state and closes the dialog.

## Composition

shadcn primitives: `Dialog*`, `Button`, `Input` (`type="number"` step 0.01, `type="date"`), `Label`, `Select` + `SelectItem` (Income / Expense). Icon: `Plus` (lucide-react).

## Integration

Rendered by `app/dashboard/budget/page.tsx` next to the page title; `onCreate`/`isCreating` are wired to `useBudget().createTransaction` / `isCreating`.

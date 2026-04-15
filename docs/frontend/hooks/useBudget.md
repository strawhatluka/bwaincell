# useBudget

**Source:** `frontend/hooks/useBudget.ts`

React Query hook for budget transactions.

## Signature

```ts
function useBudget(): {
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;
  createTransaction: (payload: {
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    date: string;
  }) => void;
  updateTransaction: (payload: { id: number; data: Partial<Transaction> }) => void;
  deleteTransaction: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};
```

## Transaction Type

```ts
interface Transaction {
  id: number;
  userId: string;
  guildId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
```

## React Query

- Query key: `['transactions']`.
- `refetchInterval: 15_000`.
- Invalidated on every mutation.

## API Endpoints

| Operation | Method / Path                     |
| --------- | --------------------------------- |
| List      | `GET /budget/transactions`        |
| Create    | `POST /budget/transactions`       |
| Update    | `PATCH /budget/transactions/:id`  |
| Delete    | `DELETE /budget/transactions/:id` |

## Side-effects

Success toasts (`"Transaction added/updated/deleted"`) and destructive-variant error toasts.

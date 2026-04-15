# use-toast

**Source:** `frontend/hooks/use-toast.ts`

Minimal toast store inspired by `react-hot-toast`, powering the shadcn/ui `<Toaster>` primitive.

## Constants

- `TOAST_LIMIT = 1` — only one toast is visible at a time; new toasts replace the current one.
- `TOAST_REMOVE_DELAY = 1_000_000` — time (ms) between dismissal and removal from state.

## Types

```ts
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string };

interface State {
  toasts: ToasterToast[];
}
```

## ID Generation

Module-local `count` counter wrapped into `Number.MAX_SAFE_INTEGER` on each `genId()` call.

## Exported API

The module exports (typical shadcn pattern):

- `toast({...})` — imperative API that dispatches `ADD_TOAST`.
- `useToast()` — hook that subscribes to the store and returns `{ toasts, toast, dismiss }`.

## Usage

```ts
const { toast } = useToast();
toast({ title: 'Saved', description: 'Your note was saved.' });
```

Destructive variant used by mutations across hooks:

```ts
toast({ title: 'Error', description: err.message, variant: 'destructive' });
```

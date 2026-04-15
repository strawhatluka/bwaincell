# lib/utils

**Source:** `frontend/lib/utils.ts`

Shared UI utilities.

## Exports

### `cn(...inputs: ClassValue[]): string`

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Combines `clsx` (falsy-filtering + conditional class objects) with `tailwind-merge` (deduplicates conflicting Tailwind classes). This is the canonical shadcn/ui `cn` helper used by every shadcn primitive.

## Example

```tsx
<div className={cn('p-4 bg-white', isActive && 'bg-blue-500', className)} />
// If isActive is true and className is 'bg-red-500', tailwind-merge keeps only 'bg-red-500'.
```

## Dependencies

- `clsx`
- `tailwind-merge`

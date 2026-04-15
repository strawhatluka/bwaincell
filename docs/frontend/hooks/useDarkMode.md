# useDarkMode / DarkModeProvider

**Source:** `frontend/hooks/useDarkMode.tsx`

Context + hook pair for dark-mode toggle.

## Exports

- `DarkModeProvider({ children })` — React component, wraps app (mounted inside `layout.tsx`).
- `useDarkMode()` — consumer hook.

## Context Shape

```ts
type DarkModeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};
```

Throws `"useDarkMode must be used within a DarkModeProvider"` when called outside the provider tree.

## Provider Behavior

- Reads `localStorage.getItem('darkMode')` on mount to hydrate initial state (`"true"` / `"false"`).
- Two-way sync with `localStorage` on every `isDarkMode` change.
- Toggles the `dark` class on `document.documentElement` to drive Tailwind's dark variants.

## Example

```tsx
const { isDarkMode, toggleDarkMode } = useDarkMode();
return <button onClick={toggleDarkMode}>{isDarkMode ? '☀️' : '🌙'}</button>;
```

## Side-effects

- `localStorage.setItem('darkMode', ...)`.
- `document.documentElement.classList.add/remove('dark')`.

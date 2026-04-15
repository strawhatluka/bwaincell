# Header

**Source:** `frontend/components/layout/Header.tsx`

Top bar inside `app/dashboard/layout.tsx`. Shows the current page title, install-PWA button, and the user avatar dropdown.

## Props

None.

## Hooks

- `useAuthContext()` — `{ username, logout }`.
- `useInstallPrompt()` — `{ isInstallable, promptInstall }`.
- `useDarkMode()` — `{ isDarkMode, toggleDarkMode }`.
- `usePathname()` — Next.js hook; maps to `pageTitles`.

## Page Title Map

```ts
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/lists': 'Lists',
  '/dashboard/notes': 'Notes',
  '/dashboard/reminders': 'Reminders',
  '/dashboard/budget': 'Budget',
  '/dashboard/schedule': 'Schedule',
};
```

Fallback is `'Dashboard'`.

## Rendering

- Left: `<MobileNav />` (visible only on `md:hidden`) + current page title.
- Right:
  - `"Install App"` button when `isInstallable` (hidden on mobile).
  - Avatar dropdown with:
    - `username` header + `Bwain.app User` label.
    - Dark-mode toggle (sun/moon icon).
    - Disabled `Profile` item.
    - Red `Log out` item that opens `ConfirmDialog`.

## Dependencies

- shadcn: `Avatar`, `Button`, `DropdownMenu*`.
- `ConfirmDialog` from `@/components/common/ConfirmDialog`.
- `MobileNav` from `./MobileNav`.
- lucide: `LogOut`, `User`, `Download`, `Moon`, `Sun`.

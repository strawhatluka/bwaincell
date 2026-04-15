# MobileNav

**Source:** `frontend/components/layout/MobileNav.tsx`

Mobile-only (`md:hidden`) navigation rendered inside a shadcn `Sheet` drawer, triggered from a hamburger button in the `Header`.

## Props

None.

## Hooks

- `useState(isOpen)` — controls drawer open state.
- `usePathname()` — for `isActive`.
- `useAuthContext()` — `{ username, logout }`.

## Navigation Items

Same list as `Sidebar` (Dashboard, Tasks, Lists, Notes, Reminders, Budget).

## Rendering

- `<SheetTrigger>` renders a `Menu`-icon `Button` on `bg-dawn-500`.
- `<SheetContent side="left" className="w-64">` contains:
  - Gradient title `"Bwain.app"`.
  - Nav links (same active styling as Sidebar). Clicking a link calls `setIsOpen(false)` before navigating.
  - `<Separator />`.
  - Footer block with current `username` (`User` icon) and a red `Log out` button that calls `logout()` and closes the sheet.

## Dependencies

- shadcn: `Sheet*`, `Separator`, `Button`.
- Next.js `Link`, `usePathname`.
- `useAuthContext`.
- lucide: `Home`, `CheckSquare`, `List`, `StickyNote`, `Bell`, `DollarSign`, `Menu`, `LogOut`, `User`.

## Integration

Rendered inside `Header` on mobile viewports.

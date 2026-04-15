# Sidebar

**Source:** `frontend/components/layout/Sidebar.tsx`

Desktop-only (`hidden md:block`) left-side navigation.

## Props

None.

## Hooks

`usePathname()` — to compute `isActive` per nav item.

## Navigation Items

```ts
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Lists', href: '/dashboard/lists', icon: List },
  { name: 'Notes', href: '/dashboard/notes', icon: StickyNote },
  { name: 'Reminders', href: '/dashboard/reminders', icon: Bell },
  { name: 'Budget', href: '/dashboard/budget', icon: DollarSign },
];
```

## Rendering

- `<aside aria-label="Main navigation" class="w-64 bg-card border-r min-h-screen p-4 hidden md:block">`.
- Title: `"Bwain.app"` with twilight→dusk gradient.
- `<nav aria-label="Primary navigation">` with `<Link>` per item.
- Active link: `bg-gradient-to-r from-twilight-100 to-dusk-100 text-twilight-700`; inactive: `text-foreground hover:bg-accent`.
- Each link sets `aria-current="page"` when active.

## Dependencies

- Next.js `Link`, `usePathname`.
- lucide icons.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, List, StickyNote, Bell, DollarSign } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Lists', href: '/dashboard/lists', icon: List },
  { name: 'Notes', href: '/dashboard/notes', icon: StickyNote },
  { name: 'Reminders', href: '/dashboard/reminders', icon: Bell },
  { name: 'Budget', href: '/dashboard/budget', icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 bg-card border-r border-border min-h-screen p-4 hidden md:block"
      aria-label="Main navigation"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-twilight-600 to-dusk-600 bg-clip-text text-transparent">
          Bwain.app
        </h1>
      </div>

      <nav className="space-y-1" aria-label="Primary navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={`Navigate to ${item.name}`}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'bg-gradient-to-r from-twilight-100 to-dusk-100 text-twilight-700'
                    : 'text-foreground hover:bg-accent'
                }
              `}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

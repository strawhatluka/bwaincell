'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CheckSquare,
  List,
  StickyNote,
  Bell,
  DollarSign,
  Menu,
  LogOut,
  User,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuthContext } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Lists', href: '/dashboard/lists', icon: List },
  { name: 'Notes', href: '/dashboard/notes', icon: StickyNote },
  { name: 'Reminders', href: '/dashboard/reminders', icon: Bell },
  { name: 'Budget', href: '/dashboard/budget', icon: DollarSign },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { username, logout } = useAuthContext();

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden bg-dawn-500 hover:bg-dawn-600 text-white"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle className="text-left text-2xl font-bold bg-gradient-to-r from-twilight-600 to-dusk-600 bg-clip-text text-transparent">
              Bwain.app
            </SheetTitle>
          </SheetHeader>

          <div className="mt-8">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-twilight-100 to-dusk-100 text-twilight-700'
                          : 'text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="px-4">
                <div className="flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{username}</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

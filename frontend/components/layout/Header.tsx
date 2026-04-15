'use client';

import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LogOut, User, Download, Moon, Sun } from 'lucide-react';
import { MobileNav } from './MobileNav';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/lists': 'Lists',
  '/dashboard/notes': 'Notes',
  '/dashboard/reminders': 'Reminders',
  '/dashboard/budget': 'Budget',
  '/dashboard/schedule': 'Schedule',
};

export function Header() {
  const { username, logout } = useAuthContext();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] || 'Dashboard';
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsLogoutOpen(false);
  };

  return (
    <header className="bg-background border-b border-border px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MobileNav />
          <h2 className="text-xl font-semibold text-foreground">{pageTitle}</h2>
        </div>

        <div className="flex items-center gap-4">
          {isInstallable && (
            <Button
              onClick={promptInstall}
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Install App
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Avatar className="cursor-pointer hover:ring-2 hover:ring-twilight-500 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-twilight-500 to-dusk-500 text-white">
                  {username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{username}</p>
                  <p className="text-xs leading-none text-muted-foreground">Bwain.app User</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleDarkMode} className="cursor-pointer">
                {isDarkMode ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsLogoutOpen(true)}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmDialog
        open={isLogoutOpen}
        onOpenChange={setIsLogoutOpen}
        title="Log Out"
        description="Are you sure you want to log out?"
        onConfirm={handleLogout}
        confirmText="Log Out"
      />
    </header>
  );
}

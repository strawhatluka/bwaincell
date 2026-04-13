'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';
import { DarkModeProvider } from '@/hooks/useDarkMode';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchInterval: 15000, // Poll every 15 seconds
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e84d8a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="description"
          content="Bwain.app is your personal productivity companion. Manage tasks, lists, notes, reminders, budget, and schedule all in one powerful PWA."
        />
        <meta
          name="keywords"
          content="productivity, tasks, notes, lists, reminders, budget, schedule, PWA"
        />
        <meta name="author" content="Bwain.app" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <title>Bwain.app - Your Personal Productivity Companion</title>
      </head>
      <body>
        <SessionProvider>
          <DarkModeProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>{children}</AuthProvider>
              <Toaster />
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </DarkModeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

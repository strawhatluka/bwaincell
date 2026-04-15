# PWA Features

Comprehensive guide to Progressive Web App (PWA) features in Bwaincell - making the web app feel native.

> **Supabase update (2026-04-15):** The PWA runs on Next.js 14 (App Router). Data-access now flows through Next.js API routes under `frontend/app/api/` (tasks, lists, notes, reminders, schedule, budget, auth), which use `@supabase/supabase-js`. Any Prisma or Sequelize references later in this file are historical. Service-worker / offline-mode / dark-mode sections remain accurate.

## Table of Contents

1. [PWA Manifest](#pwa-manifest)
2. [Service Worker](#service-worker)
3. [Offline Mode](#offline-mode)
4. [Dark Mode](#dark-mode)
5. [Push Notifications](#push-notifications)
6. [App Installation](#app-installation)
7. [Background Sync](#background-sync)
8. [AuthContext](#authcontext)
9. [Zustand State Management](#zustand-state-management)
10. [PWA Testing](#pwa-testing)
11. [PWA Deployment](#pwa-deployment)

---

## PWA Manifest

### Manifest Configuration

**File:** `frontend/public/manifest.json`

```json
{
  "name": "Bwain.app - Your Personal Productivity Companion",
  "short_name": "Bwain",
  "description": "Manage tasks, lists, notes, reminders, budget, and schedule",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#e84d8a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "Add Task",
      "url": "/dashboard/tasks",
      "description": "Create a new task"
    },
    {
      "name": "View Budget",
      "url": "/dashboard/budget",
      "description": "Check your budget"
    }
  ]
}
```

### Manifest Properties Explained

**Core Properties:**

- **name** - Full app name (displayed on install prompt)
- **short_name** - Short name (displayed on home screen, max 12 characters)
- **description** - App description (shown in app stores)
- **start_url** - Entry point when app is launched
- **display** - Display mode:
  - `standalone` - Looks like native app (no browser UI)
  - `fullscreen` - Full screen (no status bar)
  - `minimal-ui` - Minimal browser UI
  - `browser` - Normal browser window

**Visual Properties:**

- **background_color** - Splash screen background color
- **theme_color** - Browser theme color (status bar, title bar)
- **orientation** - Preferred orientation:
  - `portrait-primary` - Vertical orientation
  - `landscape-primary` - Horizontal orientation
  - `any` - Allow rotation

**Icons:**

- **192x192** - Minimum recommended size
- **512x512** - Recommended for splash screen
- **purpose: "any maskable"** - Works on all platforms with safe zones

**Shortcuts:**

- App shortcuts (Android only)
- Quick actions from home screen
- Maximum 4 shortcuts recommended

### Linking Manifest to HTML

**File:** `frontend/pages/_app.tsx`

```tsx
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="application-name" content="Bwain" />
        <meta name="description" content="Personal productivity companion" />
        <meta name="theme-color" content="#e84d8a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bwain" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
```

---

## Service Worker

### Service Worker Implementation

**File:** `frontend/public/service-worker.js`

```javascript
// Service Worker for Bwaincell PWA
const CACHE_NAME = 'bwaincell-v1';
const RUNTIME_CACHE = 'bwaincell-runtime-v1';

// Static assets to cache on install
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/tasks',
  '/dashboard/lists',
  '/dashboard/notes',
  '/dashboard/reminders',
  '/dashboard/budget',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(urlsToCache);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, return cached response
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving cached API response:', request.url);
              return cachedResponse;
            }
            // No cache, return offline response
            return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Static assets: Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Don't cache failed requests
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cache successful response
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      });
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

// Sync pending tasks with server
async function syncTasks() {
  console.log('[SW] Syncing tasks with server');

  // Get pending changes from IndexedDB
  // Send to server
  // Clear pending changes on success
}

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Bwaincell', options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data?.url || '/dashboard'));
});
```

### Registering Service Worker

**File:** `frontend/pages/_app.tsx`

```tsx
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);

          // Check for updates every hour
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000
          );
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

---

## Offline Mode

### Offline Banner Component

**File:** `frontend/components/OfflineBanner.tsx`

```tsx
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center z-50">
      <p className="font-semibold">⚠️ You are offline. Some features may be limited.</p>
    </div>
  );
}
```

### Offline Data Storage (IndexedDB)

**File:** `frontend/lib/offlineStorage.ts`

```typescript
// Open IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bwaincell-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('pendingChanges')) {
        db.createObjectStore('pendingChanges', { autoIncrement: true });
      }
    };
  });
}

// Store task offline
export async function storeTaskOffline(task: Task): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(['tasks'], 'readwrite');
  const store = transaction.objectStore('tasks');

  return new Promise((resolve, reject) => {
    const request = store.put(task);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all tasks from offline storage
export async function getTasksOffline(): Promise<Task[]> {
  const db = await openDB();
  const transaction = db.transaction(['tasks'], 'readonly');
  const store = transaction.objectStore('tasks');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Queue change for background sync
export async function queueChange(change: PendingChange): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(['pendingChanges'], 'readwrite');
  const store = transaction.objectStore('pendingChanges');

  return new Promise((resolve, reject) => {
    const request = store.add(change);
    request.onsuccess = () => {
      console.log('[Offline] Change queued for sync');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
```

### Optimistic UI Updates

```tsx
import { useState } from 'react';
import { queueChange, storeTaskOffline } from '../lib/offlineStorage';

export default function TaskForm() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleCreateTask = async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: Date.now().toString(), // Temporary ID
      ...taskData,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update (show immediately)
    setTasks((prev) => [...prev, newTask]);

    try {
      if (navigator.onLine) {
        // Online: Send to server
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });

        const { data } = await response.json();

        // Update with server ID
        setTasks((prev) => prev.map((t) => (t.id === newTask.id ? data : t)));
      } else {
        // Offline: Store locally and queue for sync
        await storeTaskOffline(newTask);
        await queueChange({ type: 'CREATE_TASK', data: taskData });
      }
    } catch (error) {
      // Revert optimistic update on error
      setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
      alert('Failed to create task');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCreateTask({ title: e.target.title.value });
      }}
    >
      <input name="title" placeholder="Task title" required />
      <button type="submit">Add Task</button>
    </form>
  );
}
```

---

## Dark Mode

### Dark Mode Implementation

**File:** `frontend/contexts/ThemeContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('bwaincell-theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Resolve system theme
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setResolvedTheme(theme === 'dark' ? 'dark' : 'light');
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);

    // Update theme-color meta tag
    const themeColor = resolvedTheme === 'dark' ? '#1a202c' : '#ffffff';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  }, [resolvedTheme]);

  // Save theme to localStorage
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('bwaincell-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Dark Mode Toggle Component

```tsx
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded ${theme === 'light' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        aria-label="Light mode"
      >
        <SunIcon className="w-5 h-5" />
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded ${theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        aria-label="Dark mode"
      >
        <MoonIcon className="w-5 h-5" />
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded ${theme === 'system' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        aria-label="System theme"
      >
        <ComputerDesktopIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
```

### Tailwind CSS Dark Mode

**File:** `frontend/tailwind.config.js`

```javascript
module.exports = {
  darkMode: 'class', // Use class-based dark mode
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#e84d8a',
          dark: '#c93d73',
        },
      },
    },
  },
};
```

**Usage in Components:**

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  <h1 className="text-2xl font-bold">Tasks</h1>
  <p className="text-gray-600 dark:text-gray-400">Your task list</p>
</div>
```

---

## Push Notifications

### Request Permission

```tsx
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.error('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
```

### Subscribe to Push Notifications

```tsx
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    }

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}
```

### Send Push Notification (Server)

```typescript
// backend/src/api/routes/push.ts
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@bwaincell.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

router.post('/push/send', authenticateUser, async (req, res) => {
  const { title, body, url } = req.body;

  // Get user's push subscriptions from database
  const subscriptions = await PushSubscription.findAll({
    where: { discordUserId: req.user.discordId },
  });

  // Send notification to all subscriptions
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url }))
    )
  );

  res.json({
    success: true,
    sent: results.filter((r) => r.status === 'fulfilled').length,
  });
});
```

---

## App Installation

### Install Prompt

```tsx
import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    // Show install prompt
    installPrompt.prompt();

    // Wait for user response
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }

    // Clear prompt
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
      <h3 className="font-bold mb-2">Install Bwaincell</h3>
      <p className="mb-4">Add to your home screen for quick access!</p>
      <div className="flex space-x-2">
        <button
          onClick={handleInstall}
          className="bg-white text-blue-500 px-4 py-2 rounded font-semibold"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="bg-blue-700 text-white px-4 py-2 rounded"
        >
          Later
        </button>
      </div>
    </div>
  );
}
```

### Check if Installed

```tsx
export function useIsInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;

    setIsInstalled(isStandalone);
  }, []);

  return isInstalled;
}
```

---

## Background Sync

### Register Background Sync

```tsx
export async function registerBackgroundSync(tag: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('[Sync] Registered:', tag);
    }
  } catch (error) {
    console.error('[Sync] Registration failed:', error);
  }
}

// Usage
await registerBackgroundSync('sync-tasks');
```

### Handle Background Sync (Service Worker)

```javascript
// service-worker.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  console.log('[SW] Syncing tasks with server');

  try {
    // Get pending changes from IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['pendingChanges'], 'readonly');
    const store = transaction.objectStore('pendingChanges');
    const changes = await store.getAll();

    // Send each change to server
    for (const change of changes) {
      await fetch('/api/tasks', {
        method: change.type === 'CREATE_TASK' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change.data),
      });

      // Remove from pending changes
      await store.delete(change.id);
    }

    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Retry sync later
  }
}
```

---

## AuthContext

### Authentication Context

**File:** `frontend/contexts/AuthContext.tsx`

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  name: string;
  discordId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
        discordId: session.user.discordId,
      });
    } else {
      setUser(null);
    }
  }, [session]);

  const login = () => {
    window.location.href = '/api/auth/signin';
  };

  const logout = () => {
    window.location.href = '/api/auth/signout';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: status === 'loading',
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Zustand State Management

### Zustand Store

**File:** `frontend/store/taskStore.ts`

```typescript
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,

      fetchTasks: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/tasks');
          const { data } = await response.json();

          set({ tasks: data, isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      createTask: async (task) => {
        try {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
          });

          const { data } = await response.json();

          set((state) => ({ tasks: [...state.tasks, data] }));
        } catch (error) {
          set({ error: error.message });
        }
      },

      updateTask: async (id, updates) => {
        try {
          const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          const { data } = await response.json();

          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? data : t)),
          }));
        } catch (error) {
          set({ error: error.message });
        }
      },

      deleteTask: async (id) => {
        try {
          await fetch(`/api/tasks/${id}`, { method: 'DELETE' });

          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          }));
        } catch (error) {
          set({ error: error.message });
        }
      },
    }),
    {
      name: 'bwaincell-task-storage', // LocalStorage key
      partialize: (state) => ({ tasks: state.tasks }), // Only persist tasks
    }
  )
);
```

**Usage:**

```tsx
import { useTaskStore } from '../store/taskStore';

export default function TaskList() {
  const { tasks, isLoading, fetchTasks, updateTask } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (isLoading) return <p>Loading tasks...</p>;

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => updateTask(task.id, { completed: !task.completed })}
          />
          {task.title}
        </li>
      ))}
    </ul>
  );
}
```

---

## PWA Testing

### PWA Checklist

### Manual Testing

```bash
# Test offline mode
1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Reload page → Should show cached content
4. Navigate between pages → Should work offline

# Test service worker
1. Open DevTools → Application tab → Service Workers
2. Verify "Activated and is running"
3. Click "Update" to test updates

# Test manifest
1. Open DevTools → Application tab → Manifest
2. Verify all properties are correct
3. Click "Add to home screen" button

# Test caching
1. Open DevTools → Application tab → Cache Storage
2. Verify caches exist (bwaincell-v1, bwaincell-runtime-v1)
3. Inspect cached resources
```

---

## PWA Deployment

### Vercel Configuration

**File:** `vercel.json`

```json
{
  "buildCommand": "npm run build --workspace=frontend",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### HTTPS Requirement

PWA features require HTTPS (except localhost):

- Service workers require HTTPS
- Push notifications require HTTPS
- Background sync requires HTTPS

**Vercel automatically provides HTTPS for all deployments.**

---

## Related Documentation

- **[Security Best Practices](security-best-practices.md)** - Authentication, HTTPS
- **[Performance Optimization](performance-optimization.md)** - Caching, code splitting
- **[Architecture Overview](../architecture/overview.md)** - Frontend architecture

---

## External Resources

- **PWA Documentation:** [web.dev/progressive-web-apps/](https://web.dev/progressive-web-apps/)
- **Service Workers:** [developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- **Web App Manifest:** [web.dev/add-manifest/](https://web.dev/add-manifest/)
- **Push Notifications:** [web.dev/push-notifications-overview/](https://web.dev/push-notifications-overview/)
- **Zustand Documentation:** [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team

# useInstallPrompt

**Source:** `frontend/hooks/useInstallPrompt.ts`

Captures the PWA `beforeinstallprompt` event so the app can surface an "Install" UI.

## Signature

```ts
function useInstallPrompt(): {
  isInstallable: boolean;
  promptInstall: () => Promise<void>;
};
```

## Internal Type

```ts
interface BeforeInstallPromptEvent {
  preventDefault(): void;
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

## Behavior

1. On mount, attaches a `beforeinstallprompt` listener on `window` that:
   - Calls `e.preventDefault()` to suppress the browser's native banner.
   - Stores the event in state.
   - Sets `isInstallable = true`.
2. `promptInstall()` calls `installPrompt.prompt()` then awaits `installPrompt.userChoice`. On `'accepted'`, clears state so the button disappears.
3. Cleanup removes the listener.

## SSR Safety

Uses `globalThis.window?.addEventListener(...)` and guards are `?.`-protected so the hook is safe in SSR builds.

# Login Page

**Source:** `frontend/app/login/page.tsx`
**Route:** `/login`

Client component. Calls `signIn('google')` from `next-auth/react`.

## State

```ts
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const router = useRouter();
```

## `handleGoogleSignIn`

```ts
const result = await signIn('google', { callbackUrl: '/dashboard', redirect: false });
if (result?.error) setError('Sign-in failed. Please check that your email is authorized.');
else if (result?.ok) router.push('/dashboard');
```

Wrapped in `try/catch`; unexpected errors surface as `"An unexpected error occurred"`.

## UI

- Gradient background card (`twilight-500 → dusk-500 → dawn-500`).
- Card with heading + tagline.
- Error banner (red) when `error` is truthy.
- Google sign-in button with inline Google logo SVG; label `"Signing in..."` while `loading`.
- Footer links to `/terms` and `/privacy`.

## Imports

- `useState` from `react`
- `signIn` from `next-auth/react`
- `useRouter` from `next/navigation`
- `Button`, `Card` from `@/components/ui/*`

## Related

- NextAuth route: [../api/auth.md](../api/auth.md)

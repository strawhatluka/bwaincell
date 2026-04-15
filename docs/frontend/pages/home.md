# Home Page

**Source:** `frontend/app/page.tsx`
**Route:** `/`

Unauthenticated marketing/landing page. Client component.

## Composition

- Full-viewport gradient background (`from-purple-950 via-purple-900 to-purple-950`).
- Title `Bwain.app` with tri-color gradient (`twilight-400 → dusk-400 → dawn-400`).
- Tagline: "Same Fweak, Same Bwaincell".
- Primary CTA: `<Link href="/login">` → `<Button size="lg">Get Started</Button>`.
- Two decorative inline SVG silhouettes (Onion Knight and Lady figures).
- Footer: links to `/privacy` and `/terms`, plus copyright.

## Imports

- `Link` from `next/link`
- `Button` from `@/components/ui/button`

## Hooks / State

None. Pure presentation.

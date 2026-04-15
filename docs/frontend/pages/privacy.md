# Privacy Policy Page

**Source:** `frontend/app/privacy/page.tsx`
**Route:** `/privacy`

Static marketing page rendering the Bwain.app privacy policy. Client component using `Link` from `next/link`.

## Composition

- Gradient background (`twilight-50 → dusk-50 → dawn-50`, dark-mode `*-950`).
- `<Card>`-style wrapper with standard Tailwind prose styling (`prose prose-sm dark:prose-invert`).
- Sections: Introduction, data we collect, how we use it, sharing, security, user rights, contact.

## State / Hooks

None. Pure static content.

## Used By

- Footer link on `frontend/app/page.tsx`.
- Footer link on `frontend/app/login/page.tsx`.

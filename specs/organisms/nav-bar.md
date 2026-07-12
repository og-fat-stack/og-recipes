# NavBar

## 1. Metadata
- **Name:** NavBar
- **Category:** organism
- **Status:** stable (`components/NavBar.tsx` — the single instance; do not create a second nav)

## 2. Overview
**When to use:** rendered once in `app/layout.tsx`. Hidden on `/login` and `/register`.
**When NOT to use:** page-internal navigation (tabs within a page) would reuse
the pill-link recipe but live in the page, not here.

## 3. Anatomy
`<nav>` bar (bottom border, header surface) · wordmark (`font-semibold
tracking-tight`) · pill links per tab · right-aligned user name
(`text-sm text-ink-subtle`, hidden < sm) + "Abmelden" ghost button

## 4. Tokens used
- bar: `border-b border-line bg-surface`
- inner: `mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3`
- active pill: `bg-contrast text-on-contrast`
- inactive pill: `text-ink-muted hover:bg-surface-subtle`
- pill shape: `rounded-full px-3 py-1.5 text-sm transition-colors`

## 5. Props / API
| Prop | Type | Notes |
|------|------|-------|
| userName | string \| null | shown before the logout button |

Tabs come from the `TABS` const; a new page = a new entry there, nothing else.

## 6. States
- active (path match) → contrast pill
- hover (inactive) → `bg-surface-subtle`

## 7. Code example
See `components/NavBar.tsx`.

## 8. Cross-references
- Related: [button](../atoms/button.md), page-layout (Storybook → Patterns/Page Layout)

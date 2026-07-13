# NavBar

## 1. Metadata
- **Name:** NavBar
- **Category:** organism
- **Status:** stable (`components/NavBar.tsx` — the single instance; do not create a second nav)

## 2. Overview
**When to use:** rendered once in `app/layout.tsx`. Hidden on `/login` and `/register`.
**When NOT to use:** page-internal navigation (tabs within a page) would reuse
the pill-link recipe but live in the page, not here.

Responsive by design — two distinct treatments from one component:
- **Desktop (`md+`):** a slim top bar (wordmark + pill links + user + logout).
- **Mobile (`< md`):** a floating **dock** fixed in the thumb zone; the first
  four tabs live in the dock, the rest open in a **"Mehr" bottom sheet**.

## 3. Anatomy
**Desktop bar** (`hidden md:block`): `<nav>` (bottom border, surface) · wordmark
(brand dot `bg-accent` + `font-semibold tracking-tight`, links home) · text pill
per tab · right-aligned user name + "Abmelden" ghost button.

**Mobile dock** (`fixed inset-x-0 bottom-0 md:hidden`, centered): rounded-full
floating bar (`border bg-surface/85 backdrop-blur-md shadow-lg`) holding the four
`PRIMARY` tabs + a "Mehr" toggle. Each dock item shows its icon always; the label
expands into a contrast pill only when active (`max-w-0 → max-w-[6rem]`, animated).

**Mobile sheet** (`fixed inset-0 z-50 md:hidden`): `bg-scrim` backdrop + bottom
panel (`rounded-t-card`, slides `translate-y-full → 0`) with a grabber, the
`OVERFLOW` tabs in a 2-col icon grid, and user name + "Abmelden". Closed state is
`inert` + `pointer-events-none`; Escape and backdrop click close it.

## 4. Tokens used
- desktop bar: `border-b border-line bg-surface`; inner `mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3`
- dock bar: `rounded-full border border-line bg-surface/85 p-1.5 shadow-lg backdrop-blur-md`; offset `pb-[max(0.75rem,env(safe-area-inset-bottom))]`
- active item (both): `bg-contrast text-on-contrast` (the reserved active-nav token)
- inactive item: `text-ink-muted` (+ `hover:bg-surface-subtle` on desktop/sheet)
- sheet backdrop: `bg-scrim`; panel `bg-surface border-line rounded-t-card`; grabber `bg-surface-inset`
- pill/dock shape: `rounded-full … transition-all` · sheet rows: `rounded-control`

## 5. Props / API
| Prop | Type | Notes |
|------|------|-------|
| userName | string \| null | shown before the logout button (desktop) / in the sheet (mobile) |

`TABS` is the source of truth; `PRIMARY = TABS.slice(0, 4)` show in the dock, the
rest in the sheet. A new page = a new `TABS` entry (with an icon), nothing else.

## 6. States
- active (path match) → contrast pill; on mobile the label expands
- "Mehr" is marked active while on any overflow route, or while the sheet is open
- sheet: open (`translate-y-0`, scrim visible) / closed (`translate-y-full`, inert)
- hover (inactive, desktop/sheet) → `bg-surface-subtle`

## 7. Code example
See `components/NavBar.tsx`. Content pages must keep bottom room for the dock —
`app/layout.tsx` main uses `pb-28 md:py-8`.

## 8. Cross-references
- Related: [button](../atoms/button.md), page-layout (Storybook → Patterns/Page Layout)
- Token: `scrim` (Storybook → Tokens/Token Reference)

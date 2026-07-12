# Page Header

## 1. Metadata
- **Name:** Page Header
- **Category:** organism
- **Status:** stable (className recipe)

## 2. Overview
**When to use:** the top of every page: title row, optional subtitle, optional
actions, optional progress. Exactly one h1 per page.
**When NOT to use:** section headings within a page are the small-caps-style
`text-sm font-medium text-ink-subtle` heading, not an h2-scale title.

## 3. Anatomy
title row (`flex items-baseline justify-between` — or `items-center` when the
right side is buttons) · h1 (`text-3xl font-semibold tracking-tight`, German) ·
right slot: date/meta (`text-sm text-ink-subtle`) or action buttons (`flex gap-2`)
· subtitle (`mt-1 text-ink-muted`) · optional [progress-bar](../atoms/progress-bar.md) (`mt-3`)

## 4. Tokens used
- `text-ink-subtle` (meta), `text-ink-muted` (subtitle); title inherits `text-ink`

## 5. Props / API
Right-slot buttons follow [button](../atoms/button.md) — at most one primary.

## 6. States
None.

## 7. Code example
```tsx
<header>
  <div className="flex items-baseline justify-between">
    <h1 className="text-3xl font-semibold tracking-tight">Heute</h1>
    <span className="text-sm text-ink-subtle">{todayLabel}</span>
  </div>
  <p className="mt-1 text-ink-muted">3 von 7 erledigt</p>
</header>
```

## 8. Cross-references
- Related: [progress-bar](../atoms/progress-bar.md), page-layout (Storybook → Patterns/Page Layout)

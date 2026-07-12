# Data Table (Wochenplan-Grid)

## 1. Metadata
- **Name:** Data Table
- **Category:** organism
- **Status:** stable (className recipe — see `app/plan/page.tsx`)

## 2. Overview
**When to use:** two-dimensional data (days × slots). Lists of records are NOT
tables — use a list [card](../molecules/card.md).
**When NOT to use:** anything that reads fine as stacked rows on mobile.

## 3. Anatomy
`overflow-x-auto` wrapper · `<table>` (`w-full min-w-[640px] border-separate
border-spacing-0 text-sm`) · sticky first column · header cells · bordered body cells

## 4. Tokens used
- header/sticky cells: `bg-surface-page text-ink-subtle` with
  `text-xs font-medium uppercase tracking-wide`
- body cells: `border border-line p-2 align-top`
- cell titles: `text-sm font-medium leading-snug`

## 5. Props / API
`min-w-[…]` on table/cells is a layout measurement and allowed (audit warning,
not error) — keep 640px table / 140px column unless content demands otherwise.

## 6. States
- cell link hover → `hover:underline`

## 7. Code example
See the Wochenplan table in `app/plan/page.tsx`.

## 8. Cross-references
- Related: [card](../molecules/card.md), page-layout (Storybook → Patterns/Page Layout)

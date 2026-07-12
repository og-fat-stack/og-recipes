# Progress Bar

## 1. Metadata
- **Name:** Progress Bar
- **Category:** atom
- **Status:** stable (className recipe)

## 2. Overview
**When to use:** fraction-of-target feedback — Tages-Checkliste, kcal/Protein/Wasser-Ziele.
**When NOT to use:** binary state (use [toggle](./toggle.md) or a status dot).

## 3. Anatomy
track (full width, fixed height) · fill (percentage width)

## 4. Tokens used
- `bg-surface-inset` — track
- `bg-accent` — fill (use `bg-warn`/`bg-danger-ink`-style hues only if the spec of the page calls for over-target warning)
- `rounded-full` on both, `h-2` height, `overflow-hidden` on the track
- `transition-all` — animated width

## 5. Props / API
Width is the one legitimate inline `style` in the app (dynamic percentage).

## 6. States
Static besides the animated width.

## 7. Code example
```tsx
<div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-inset">
  <div
    className="h-full rounded-full bg-accent transition-all"
    style={{ width: `${(done / total) * 100}%` }}
  />
</div>
```

## 8. Cross-references
- Related: [badge](./badge.md), [page-header](../organisms/page-header.md)

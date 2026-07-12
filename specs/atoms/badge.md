# Badge / Chip / Status-Dot

## 1. Metadata
- **Name:** Badge (chip) and Status-Dot
- **Category:** atom
- **Status:** stable (className recipes)

## 2. Overview
**When to use:** short inline status or category markers — tags on a recipe,
"fällig" counts, done/due state on a row.
**When NOT to use:** multi-sentence status belongs in a [notice](../molecules/notice.md);
interactive filters are outline [buttons](./button.md).

## 3. Anatomy
Chip: pill container · xs label. Dot: 8px circle (`h-2 w-2`) next to a row label.

## 4. Tokens used
- neutral chip: `bg-surface-subtle text-ink-muted`
- solid chip: `bg-contrast text-on-contrast`
- success tint: `bg-accent-surface text-accent-surface-ink`
- dot states: `bg-accent` (ok/done) · `bg-warn` (fällig)
- `rounded-full px-2 py-0.5 text-xs` — chip shape

## 5. Props / API
| Variant | Recipe |
|---------|--------|
| neutral | `rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted` |
| solid | `rounded-full bg-contrast px-2 py-0.5 text-xs text-on-contrast` |
| dot | `h-2 w-2 shrink-0 rounded-full bg-accent` (or `bg-warn`) |
| inline warn text | `text-xs text-warn-ink` (e.g. "2 fällig") |

Training-category chips (`KIND_META` in `lib/training.ts`):
Kraft `bg-tag-strength text-tag-strength-ink` · Cardio `bg-tag-cardio
text-tag-cardio-ink` · Aktiv `bg-accent-surface text-accent-surface-ink` ·
Pause `bg-surface-inset text-ink-muted`. A new category = a new `--og-tag-*`
token pair, not a raw palette class.

## 6. States
Static — a badge never has hover/focus. If it's clickable, it's a button.

## 7. Code example
```tsx
<span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted">
  vegetarisch
</span>
```

## 8. Cross-references
- Related: [notice](../molecules/notice.md), [progress-bar](./progress-bar.md)

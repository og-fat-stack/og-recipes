# Card / List-Card

## 1. Metadata
- **Name:** Card, List-Card, Interactive Card, Empty State
- **Category:** molecule
- **Status:** stable (className recipes)

## 2. Overview
**When to use:** every bordered panel — content blocks, row lists (Routinen,
Checkliste), clickable recipe tiles, empty states.
**When NOT to use:** status messages use [notice](./notice.md); page-level
grouping without a visual box is just `space-y-*`.

## 3. Anatomy
container (border + surface + card radius) · content (`p-4`) OR rows
(`divide-y`, each row `px-4 py-3`)

## 4. Tokens used
- `rounded-card border border-line bg-surface` — every variant's base
- `divide-y divide-line` — row lists
- `hover:bg-surface-hover` — clickable rows
- `hover:border-line-active` + `transition-colors` — clickable whole cards
- `border-dashed border-line-strong` — empty state
- row typography: title `text-sm font-medium`, second line `text-xs text-ink-subtle`

## 5. Props / API
| Variant | Recipe |
|---------|--------|
| content card | `rounded-card border border-line bg-surface p-4` |
| list card | `divide-y divide-line rounded-card border border-line bg-surface` with rows `flex items-center gap-3 px-4 py-3 hover:bg-surface-hover` |
| interactive card | content card + `transition-colors hover:border-line-active` (whole card is a `<Link>`) |
| empty state | `rounded-card border border-dashed border-line-strong p-8 text-center` with `text-ink-muted` prose |

## 6. States
- row hover → `bg-surface-hover`; card hover → `border-line-active`
- pending row (button row) → `disabled:opacity-60`

## 7. Code example
```tsx
<ul className="divide-y divide-line rounded-card border border-line bg-surface">
  <li>
    <Link href="…" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
      <span className="flex flex-col">
        <span className="text-sm font-medium">Titel</span>
        <span className="text-xs text-ink-subtle">Untertitel</span>
      </span>
      <span className="ml-auto text-xs text-ink-subtle">→</span>
    </Link>
  </li>
</ul>
```

## 8. Cross-references
- Related: [badge](../atoms/badge.md), [toggle](../atoms/toggle.md), [notice](./notice.md), [data-table](../organisms/data-table.md)

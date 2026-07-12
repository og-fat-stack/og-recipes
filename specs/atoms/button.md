# Button

## 1. Metadata
- **Name:** Button
- **Category:** atom
- **Status:** stable (className recipe — there is no `<Button>` component; copy the recipe)

## 2. Overview
**When to use:** any discrete user action — submit, generate, toggle, delete.
**When NOT to use:** navigation renders as a `<Link>`; if it looks like a button
it may reuse these recipes, but plain inline navigation is an underlined link
(`className="underline"`). Whole-card actions use interactive [card](../molecules/card.md).

## 3. Anatomy
container · label (German, verb-first: "Speichern", "Plan erzeugen", "Abmelden")

## 4. Tokens used
- `bg-accent` / `hover:bg-accent-hover` / `text-on-accent` — primary
- `bg-contrast` / `hover:bg-contrast-hover` / `text-on-contrast` — solid secondary
- `border-line-strong`, `text-ink-muted`, `hover:bg-surface-subtle` — outline/ghost
- `text-danger-ink`, `border-danger-line`, `hover:bg-danger-surface` — danger
- `rounded-full` (standalone) or `rounded-control` (inside form stacks)
- `disabled:opacity-50` (or `-60`), `text-sm font-medium`, `px-4 py-2` (pill) / `px-3 py-1.5` (compact)

## 5. Props / API
Variants (by intent, max one primary per view):
| Variant | Recipe |
|---------|--------|
| primary | `rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover` |
| solid | `rounded-full bg-contrast px-4 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover` |
| outline | `rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle` |
| danger | `rounded-full border border-danger-line px-3 py-1.5 text-sm text-danger-ink hover:bg-danger-surface` |
| form submit | same as primary/solid but `rounded-control`, full-width in the form stack |

## 6. States
- hover → `*-hover` token (bg) or `bg-surface-subtle` / `bg-danger-surface` (outline)
- pending/disabled → `disabled:opacity-50` + `disabled` attr while a transition/action runs
- No focus ring convention yet — do not invent one ad hoc.

## 7. Code example
```tsx
<button
  type="submit"
  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
>
  Speichern
</button>
```

## 8. Cross-references
- Related: [toggle](./toggle.md), [form-field](../molecules/form-field.md), [nav-bar](../organisms/nav-bar.md)

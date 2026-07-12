# Toggle (Switch-Row)

## 1. Metadata
- **Name:** Toggle
- **Category:** atom
- **Status:** stable (see `components/ActivityToggle.tsx`, `components/BudgetToggle.tsx`)

## 2. Overview
**When to use:** a boolean setting that takes effect immediately (server action
in a `useTransition`). Always rendered as a full-width card-row: label +
description left, switch right.
**When NOT to use:** choices among >2 options, or values that need a save
button — use a form with [inputs](./input.md).

## 3. Anatomy
card-row button (whole row clickable, `aria-pressed`) · title (`text-sm font-medium`)
· description (`text-xs text-ink-subtle`, states the consequence of the current
value) · switch track (`h-6 w-11`) · knob (`h-5 w-5`)

## 4. Tokens used
- row: `rounded-card border border-line bg-surface px-4 py-3 hover:border-line-active disabled:opacity-60`
- track on: `bg-accent` · track off: `bg-surface-inset`
- knob: `bg-on-accent shadow` (always-white knob, sits on the accent track), `translate-x-5` when on
- `transition-colors` (track), `transition-transform` (knob)

## 5. Props / API
| Prop | Type | Notes |
|------|------|-------|
| enabled | boolean | server state |
| onClick | server action in `useTransition`, row `disabled` while pending |

## 6. States
- on → track `bg-accent`, knob translated
- off → track `bg-surface-inset`
- pending → `disabled:opacity-60`

## 7. Code example
See `components/ActivityToggle.tsx` — copy that structure for new toggles.

## 8. Cross-references
- Related: [card](../molecules/card.md), [button](./button.md)

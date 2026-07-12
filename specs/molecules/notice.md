# Notice (Hinweis-Box)

## 1. Metadata
- **Name:** Notice
- **Category:** molecule
- **Status:** stable (className recipes)

## 2. Overview
**When to use:** page-level status the user should read — warnings ("Profil
fehlt"), errors from actions, neutral explanations. There are no modals or
toasts in this app; the notice IS the feedback mechanism.
**When NOT to use:** single-field validation → inline error in
[form-field](./form-field.md); tiny inline status → [badge](../atoms/badge.md).

## 3. Anatomy
tinted box (card radius, tinted border + surface) · `text-sm` message ·
optionally an action button on the right (`flex items-center justify-between gap-3`)

## 4. Tokens used
| Intent | Recipe |
|--------|--------|
| warn | `rounded-card border border-warn-line bg-warn-surface p-3 text-sm text-warn-surface-ink` |
| danger | `rounded-card border border-danger-line bg-danger-surface p-3 text-sm text-danger-surface-ink` |
| neutral (info) | `rounded-card border border-line bg-surface-subtle p-3 text-sm text-ink-muted` |

(`p-4` when the notice contains an action button.)

## 5. Props / API
Message is German prose, informal "du". At most one notice per intent per page.

## 6. States
Static. Dismissal = fixing the cause.

## 7. Code example
```tsx
<div className="rounded-card border border-warn-line bg-warn-surface p-3 text-sm text-warn-surface-ink">
  Dein Profil ist unvollständig — Ziele werden geschätzt.
</div>
```

## 8. Cross-references
- Related: [form-field](./form-field.md), [badge](../atoms/badge.md)

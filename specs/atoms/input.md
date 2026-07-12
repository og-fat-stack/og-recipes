# Input

## 1. Metadata
- **Name:** Input (text/number/password/select/textarea)
- **Category:** atom
- **Status:** stable (className recipe; passwords use `components/PasswordInput.tsx`)

## 2. Overview
**When to use:** every form control.
**When NOT to use:** boolean on/off settings use [toggle](./toggle.md), not a checkbox.

## 3. Anatomy
control only — the label lives in [form-field](../molecules/form-field.md).

## 4. Tokens used
- `rounded-control` — corner
- `border-line-strong` — border; `focus:border-line-active` — focus
- `bg-surface` — background
- `px-3 py-2 text-base` — padding/type. **Controls use `text-base` (16px), not
  `text-sm`** — inputs below 16px make iOS Safari zoom on focus. Labels stay
  `text-sm`.
- `outline-none` — focus is shown via border, not outline

## 5. Props / API
The canonical recipe (share it as a local `inputClass` const per page):
```
rounded-control border border-line-strong bg-surface px-3 py-2 text-base outline-none focus:border-line-active
```

## 6. States
- focus → `border-line-active`
- error → message below the field (see form-field), the control itself is unchanged
- disabled → `disabled:opacity-60`

## 7. Code example
```tsx
const inputClass =
  "rounded-control border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-line-active";
<input id="username" name="username" type="text" required className={inputClass} />
```

## 8. Cross-references
- Related: [form-field](../molecules/form-field.md), [button](./button.md)

# Form / Form-Field

## 1. Metadata
- **Name:** Form-Field
- **Category:** molecule
- **Status:** stable (className recipes)

## 2. Overview
**When to use:** any labeled input in a form. Forms post to server actions
(`action={...}`), no client-side form state unless interactivity demands it.
**When NOT to use:** instant boolean settings are a [toggle](../atoms/toggle.md).

## 3. Anatomy
form stack (`flex flex-col gap-3`) · label (`text-sm font-medium`, always
`htmlFor`) · [input](../atoms/input.md) · optional error line · submit
[button](../atoms/button.md) (`rounded-control`, `mt-1`)

## 4. Tokens used
- label: `text-sm font-medium` (inherits `text-ink`)
- inline error: `text-sm text-danger-ink`
- boxed error: `rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink`
- help text below the form: `text-sm text-ink-subtle`

## 5. Props / API
Field order: label → control → (error). German labels ("Benutzername",
"Passwort"), sentence-style error messages ("Benutzername oder Passwort falsch.").

## 6. States
- error → error line/box appears under the affected control (or above the submit)
- pending → submit button `disabled:opacity-50`

## 7. Code example
```tsx
<form action={login} className="flex flex-col gap-3">
  <label htmlFor="username" className="text-sm font-medium">Benutzername</label>
  <input id="username" name="username" type="text" required className={inputClass} />
  {error && <p className="text-sm text-danger-ink">Benutzername oder Passwort falsch.</p>}
  <button type="submit" className="mt-1 rounded-control bg-contrast px-4 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover">
    Anmelden
  </button>
</form>
```

## 8. Cross-references
- Related: [input](../atoms/input.md), [button](../atoms/button.md), [notice](./notice.md)

"use client";

import { useActionState } from "react";
import { createRecipe, type SaveRecipeState } from "../actions";

export function RecipeForm() {
  const [state, action, pending] = useActionState<SaveRecipeState, FormData>(
    createRecipe,
    {},
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titel" name="title" required />
        <Field
          label="Küche"
          name="cuisine"
          required
          placeholder="Levantinisch / Mediterran / Asiatisch..."
        />
        <Field
          label="Portionen"
          name="portions"
          type="number"
          defaultValue={4}
          required
        />
        <Field
          label="Haltbarkeit im Kühlschrank (Tage)"
          name="batchStorageDays"
          type="number"
          defaultValue={4}
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink-subtle">
          Makros pro Portion
        </legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field
            label="kcal"
            name="kcalPerPortion"
            type="number"
            required
          />
          <Field label="Eiweiß (g)" name="proteinG" type="number" required />
          <Field label="Kohlenhydrate (g)" name="carbG" type="number" required />
          <Field label="Fett (g)" name="fatG" type="number" required />
        </div>
      </fieldset>

      <TextArea
        label="Zutaten"
        name="ingredients"
        rows={8}
        required
        hint="Eine pro Zeile. Format: Name | Menge | Einheit. Beispiel: Hähnchenschenkel | 800 | g"
      />

      <TextArea
        label="Schritte"
        name="steps"
        rows={8}
        required
        hint="Ein Schritt pro Zeile."
      />

      <Field
        label="Techniken"
        name="techniques"
        placeholder="scharf anbraten, schmoren, emulgieren"
        hint="Kommagetrennt. Werden zu klickbaren Tags."
      />

      {state.error && (
        <p className="text-sm text-danger-ink">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover disabled:opacity-50"
      >
        {pending ? "Speichern..." : "Rezept speichern"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <input
        {...rest}
        className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
      />
      {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  hint,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-ink-muted">{label}</span>
      <textarea
        {...rest}
        className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base font-mono"
      />
      {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

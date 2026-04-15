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
          label="Portionen pro Batch"
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
        <legend className="text-sm font-medium text-zinc-500">
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

      <TextArea label="Notizen" name="notes" rows={3} />

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        {...rest}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
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
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <textarea
        {...rest}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
      />
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

"use client";

import { useActionState, useTransition } from "react";
import {
  generateRecipe,
  saveGeneratedRecipe,
  type GenerateState,
} from "./actions";

const INITIAL: GenerateState = { status: "idle" };

const EXAMPLE_PROMPTS = [
  "Eiweißreiche Levantinische Bowl mit Rindfleisch",
  "Mediterranes Ofengericht mit Kichererbsen und Hähnchen",
  "Schnelles asiatisches Rezept mit Tofu und viel Gemüse",
];

export function GeneratePanel() {
  const [state, action, pending] = useActionState<GenerateState, FormData>(
    generateRecipe,
    INITIAL,
  );
  const [saving, startSave] = useTransition();

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Was möchtest du kochen?
          </span>
          <textarea
            name="prompt"
            rows={3}
            required
            defaultValue={
              state.status === "error" || state.status === "ok"
                ? state.prompt
                : ""
            }
            placeholder="z. B. Levantinisches Rezept mit Linsen, wenig Zeit, eiweißreich"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <div className="flex flex-wrap gap-1">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                const ta = form?.querySelector(
                  'textarea[name="prompt"]',
                ) as HTMLTextAreaElement | null;
                if (ta) ta.value = p;
              }}
              className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Generiere mit Claude..." : "Generieren"}
        </button>
      </form>

      {state.status === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {state.error}
        </p>
      )}

      {state.status === "ok" && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{state.draft.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {state.draft.cuisine} · {state.draft.portions} Portionen · hält{" "}
                {state.draft.batchStorageDays} Tage
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                startSave(() =>
                  saveGeneratedRecipe(JSON.stringify(state.draft)).then(
                    () => {},
                  ),
                )
              }
              className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Speichere..." : "Übernehmen & Speichern"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="kcal" value={state.draft.kcalPerPortion.toString()} />
            <Stat label="Eiweiß" value={`${state.draft.proteinG} g`} />
            <Stat label="KH" value={`${state.draft.carbG} g`} />
            <Stat label="Fett" value={`${state.draft.fatG} g`} />
          </div>

          {state.draft.techniques.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {state.draft.techniques.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium text-zinc-500">Zutaten</h3>
            <ul className="space-y-1 text-sm">
              {state.draft.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between">
                  <span>{ing.name}</span>
                  {(ing.qty != null || ing.unit) && (
                    <span className="text-zinc-500">
                      {ing.qty ?? ""} {ing.unit ?? ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-zinc-500">Schritte</h3>
            <ol className="space-y-1 text-sm">
              {state.draft.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-semibold text-zinc-500">
                    {i + 1}.
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {state.draft.notes && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-zinc-500">
                Notizen
              </h3>
              <p className="whitespace-pre-wrap text-sm">{state.draft.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

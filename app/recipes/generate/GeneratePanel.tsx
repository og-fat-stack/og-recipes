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
          <span className="text-ink-muted">
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
            className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
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
              className="rounded-full border border-line-strong px-2 py-1 text-xs text-ink-muted hover:bg-surface-subtle"
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover disabled:opacity-50"
        >
          {pending ? "Generiere mit Claude..." : "Generieren"}
        </button>
      </form>

      {state.status === "error" && (
        <p className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink">
          {state.error}
        </p>
      )}

      {state.status === "ok" && (
        <div className="space-y-4 rounded-card border border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{state.draft.title}</h2>
              <p className="mt-1 text-sm text-ink-subtle">
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
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
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
                  className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium text-ink-subtle">Zutaten</h3>
            <ul className="space-y-1 text-sm">
              {state.draft.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between">
                  <span>{ing.name}</span>
                  {(ing.qty != null || ing.unit) && (
                    <span className="text-ink-subtle">
                      {ing.qty ?? ""} {ing.unit ?? ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-ink-subtle">Schritte</h3>
            <ol className="space-y-1 text-sm">
              {state.draft.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-semibold text-ink-subtle">
                    {i + 1}.
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {state.draft.notes && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-ink-subtle">
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
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

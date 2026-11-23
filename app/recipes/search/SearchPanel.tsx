"use client";

import { useActionState, useState, useTransition } from "react";
import { searchRecipes, type SearchState } from "./actions";
import {
  prepareFoundRecipe,
  saveImportedRecipe,
  type ImportState,
} from "../import/actions";
import { RecipeDraftPreview } from "../../../components/RecipeDraftPreview";

const INITIAL: SearchState = { status: "idle" };

const EXAMPLES = [
  "Levantinisch mit Linsen, schnell",
  "Mediterranes Ofengericht mit Hähnchen",
  "Asiatisch mit Tofu und viel Gemüse",
];

export function SearchPanel() {
  const [state, action, pending] = useActionState<SearchState, FormData>(
    searchRecipes,
    INITIAL,
  );
  const [chosen, setChosen] = useState<{ url: string; result: ImportState } | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [preparing, startPrepare] = useTransition();
  const [saving, startSave] = useTransition();

  const choose = (url: string) => {
    setLoadingUrl(url);
    startPrepare(async () => {
      const result = await prepareFoundRecipe(url);
      setChosen({ url, result });
      setLoadingUrl(null);
    });
  };

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Was möchtest du kochen?</span>
          <textarea
            name="wish"
            rows={2}
            required
            defaultValue={state.status === "idle" ? "" : state.wish}
            placeholder="z. B. Levantinisch mit Linsen, wenig Zeit"
            className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {EXAMPLES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                const ta = e.currentTarget
                  .closest("form")
                  ?.querySelector('textarea[name="wish"]') as HTMLTextAreaElement | null;
                if (ta) ta.value = p;
              }}
              className="rounded-full border border-line-strong px-2 py-1 text-xs text-ink-muted hover:bg-surface-subtle"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            name="mealType"
            defaultValue={state.status === "idle" ? "main" : state.mealType}
            className="rounded-control border border-line-strong bg-surface px-3 py-2 text-sm"
          >
            <option value="main">Hauptgericht</option>
            <option value="breakfast">Frühstück</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover disabled:opacity-50"
          >
            {pending ? "Suche im Web..." : "Suchen"}
          </button>
        </div>
      </form>

      {state.status === "error" && (
        <p className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink">
          {state.error}
        </p>
      )}

      {chosen?.result.status === "error" && (
        <p className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink">
          {chosen.result.error}
        </p>
      )}

      {chosen?.result.status === "ok" && (
        <RecipeDraftPreview
          draft={chosen.result.draft}
          sourceUrl={chosen.result.url || undefined}
          warnings={chosen.result.draft.violations}
          saving={saving}
          onSave={() => {
            const r = chosen.result;
            if (r.status !== "ok") return;
            startSave(() =>
              saveImportedRecipe(JSON.stringify(r.draft), r.url).then(() => {}),
            );
          }}
        />
      )}

      {state.status === "ok" && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {state.results.map((r) => (
            <li
              key={r.url}
              className="space-y-3 rounded-card border border-line bg-surface p-4"
            >
              <div>
                <h2 className="font-medium">{r.title}</h2>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {r.site}
                  </a>
                  {r.yield && ` · ${r.yield}`}
                  {r.totalTime && ` · ${r.totalTime}`}
                  {r.rating && ` · ${r.rating}`}
                </p>
                {(r.kcal || r.protein) && (
                  <p className="mt-1 text-xs text-ink-muted">
                    Laut Seite pro Portion: {[r.kcal, r.protein && `${r.protein} Eiweiß`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-ink-muted">
                  Zutaten ({r.ingredients.length})
                </summary>
                <ul className="mt-1 list-inside list-disc text-ink-muted">
                  {r.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </details>
              <button
                type="button"
                disabled={preparing}
                onClick={() => choose(r.url)}
                className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50"
              >
                {loadingUrl === r.url
                  ? "Übertrage und rechne Nährwerte..."
                  : chosen?.url === r.url
                    ? "Ausgewählt ↑"
                    : "Ansehen & übernehmen"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

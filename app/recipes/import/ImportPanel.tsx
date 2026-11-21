"use client";

import { useActionState, useTransition } from "react";
import { importRecipe, saveImportedRecipe, type ImportState } from "./actions";
import { RecipeDraftPreview } from "../../../components/RecipeDraftPreview";

const INITIAL: ImportState = { status: "idle" };

export function ImportPanel() {
  const [state, action, pending] = useActionState<ImportState, FormData>(
    importRecipe,
    INITIAL,
  );
  const [saving, startSave] = useTransition();

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-muted">Link zum Rezept</span>
          <input
            name="url"
            type="url"
            inputMode="url"
            defaultValue={state.status === "idle" ? "" : state.url}
            placeholder="https://www.eatsmarter.de/rezepte/…"
            className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
          />
        </label>
        <details
          open={state.status === "error" && (!!state.text || !state.url)}
          className="text-sm"
        >
          <summary className="cursor-pointer text-ink-muted">
            Seite blockiert? Rezepttext einfügen
          </summary>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-ink-subtle">
              Manche Seiten (z. B. Chefkoch) lassen sich nicht automatisch
              abrufen. Markiere dort Zutaten und Zubereitung, kopiere sie und
              füge sie hier ein. Den Link oben kannst du als Quelle stehen
              lassen.
            </span>
            <textarea
              name="text"
              rows={8}
              defaultValue={state.status === "error" ? state.text : ""}
              placeholder="Zutaten für 4 Portionen …"
              className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
            />
          </label>
        </details>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover disabled:opacity-50"
        >
          {pending ? "Importiere und rechne Nährwerte..." : "Importieren"}
        </button>
      </form>

      {state.status === "error" && (
        <p className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink">
          {state.error}
        </p>
      )}

      {state.status === "ok" && (
        <RecipeDraftPreview
          draft={state.draft}
          sourceUrl={state.url || undefined}
          warnings={state.draft.violations}
          saving={saving}
          onSave={() =>
            startSave(() =>
              saveImportedRecipe(JSON.stringify(state.draft), state.url).then(() => {}),
            )
          }
        />
      )}
    </div>
  );
}

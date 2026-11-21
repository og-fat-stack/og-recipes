import type { RecipeDraft } from "../lib/ai/recipeDraft";
import { MacroSourceNote } from "./MacroSourceNote";

/**
 * Vorschau eines noch nicht gespeicherten Rezepts (Rezeptsuche oder
 * Link-Import) mit Speichern-Button. Geteilt von /recipes/search und
 * /recipes/import.
 */
export function RecipeDraftPreview({
  draft,
  onSave,
  saving = false,
  sourceUrl,
  warnings = [],
}: {
  draft: RecipeDraft;
  onSave: () => void;
  saving?: boolean;
  /** Originalseite bei importierten Rezepten. */
  sourceUrl?: string;
  /** Zutaten, die nicht zu den Vorgaben passen (Rezept bleibt unverändert). */
  warnings?: string[];
}) {
  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{draft.title}</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            {draft.cuisine} · {draft.portions} Portionen · hält{" "}
            {draft.batchStorageDays} Tage
          </p>
          {sourceUrl && (
            <p className="mt-1 text-sm text-ink-subtle">
              Quelle:{" "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {hostname(sourceUrl)}
              </a>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Speichere..." : "Übernehmen & Speichern"}
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-card border border-warn-line bg-warn-surface p-3 text-sm text-warn-surface-ink">
          <p className="font-medium">Passt nicht zu deinen Vorgaben</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="kcal" value={draft.kcalPerPortion.toString()} />
          <Stat label="Eiweiß" value={`${draft.proteinG} g`} />
          <Stat label="KH" value={`${draft.carbG} g`} />
          <Stat label="Fett" value={`${draft.fatG} g`} />
        </div>
        <MacroSourceNote
          macroSource={draft.macroSource}
          macroCoverage={draft.macroCoverage}
        />
      </div>

      {draft.techniques.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {draft.techniques.map((t) => (
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
          {draft.ingredients.map((ing, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{ing.name}</span>
              {(ing.qty != null || ing.unit) && (
                <span className="shrink-0 text-ink-subtle">
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
          {draft.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 font-semibold text-ink-subtle">
                {i + 1}.
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

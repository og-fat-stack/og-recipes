"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WeekSel } from "../../lib/plan";
import {
  generateWeeklyPlan,
  type GeneratePlanState,
} from "./actions";

const DAY_OPTIONS = [
  { value: 0, label: "Mo" },
  { value: 1, label: "Di" },
  { value: 2, label: "Mi" },
  { value: 3, label: "Do" },
  { value: 4, label: "Fr" },
  { value: 5, label: "Sa" },
  { value: 6, label: "So" },
];

// Wie oft die Seite während einer laufenden Hintergrund-Generierung nach
// frischen Daten fragt (leichtgewichtiger Soft-Refresh, kein Reload).
const POLL_MS = 4000;

export function GeneratePlanButton({
  hasPlan,
  week,
  minDay,
  generating,
}: {
  hasPlan: boolean;
  week: WeekSel;
  minDay: number;
  /** Läuft für diese Woche bereits eine Hintergrund-Generierung (Server-Stand)? */
  generating: boolean;
}) {
  const [state, action, pending] = useActionState<
    GeneratePlanState,
    FormData
  >(generateWeeklyPlan, { status: "idle" });
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();

  // Solange im Hintergrund geplant wird, in Intervallen sanft aktualisieren
  // (nur Server-Daten neu laden, keine volle Seiten-/Formular-Sperre).
  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [generating, router]);

  const dayOptions = DAY_OPTIONS.filter((d) => d.value >= minDay);
  const nextWeek = week === "next";
  const busy = pending || generating;
  // Kurz halten (die aktive Wochen-Registerkarte zeigt schon, welche Woche).
  const label = busy
    ? "Läuft im Hintergrund …"
    : hasPlan
      ? "Neu generieren"
      : "✨ Generieren";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="week" value={week} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 whitespace-nowrap rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50 sm:flex-none"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => setShowOptions((s) => !s)}
          className="whitespace-nowrap rounded-full border border-line-strong px-3 py-2 text-xs text-ink-muted hover:bg-surface-subtle"
        >
          {showOptions ? "Optionen verbergen" : "Optionen"}
        </button>
      </div>

      {showOptions && (
        <div className="space-y-3 rounded-card border border-line bg-surface-page p-3 text-sm">
          <div>
            <label
              htmlFor="useUpIngredients"
              className="mb-1 block text-xs font-medium text-ink-muted"
            >
              Zutaten zum Aufbrauchen (komma-separiert)
            </label>
            <input
              id="useUpIngredients"
              name="useUpIngredients"
              type="text"
              placeholder="z.B. Zucchini, Hähnchenschenkel, Spinat"
              className="w-full rounded-control border border-line-strong bg-surface px-2 py-1 text-base"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-ink-muted">
              Von
              <select
                name="startDay"
                defaultValue={String(minDay)}
                className="ml-2 rounded-control border border-line-strong bg-surface px-2 py-1 text-base"
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-muted">
              Bis
              <select
                name="endDay"
                defaultValue="6"
                className="ml-2 rounded-control border border-line-strong bg-surface px-2 py-1 text-base"
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-ink-subtle">
              An den nicht gewählten Tagen ist kein Kochen geplant.
              {!nextWeek && minDay > 0
                ? " Vergangene Tage dieser Woche sind gesperrt."
                : ""}
            </span>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

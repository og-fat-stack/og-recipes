"use client";

import { useActionState, useState } from "react";
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

export function GeneratePlanButton({
  hasPlan,
  week,
  minDay,
}: {
  hasPlan: boolean;
  week: WeekSel;
  minDay: number;
}) {
  const [state, action, pending] = useActionState<
    GeneratePlanState,
    FormData
  >(generateWeeklyPlan, { status: "idle" });
  const [showOptions, setShowOptions] = useState(false);

  const dayOptions = DAY_OPTIONS.filter((d) => d.value >= minDay);
  const nextWeek = week === "next";
  const label = pending
    ? "Claude plant..."
    : nextWeek
      ? hasPlan
        ? "Nächste Woche neu generieren"
        : "✨ Nächste Woche generieren"
      : hasPlan
        ? "Woche neu generieren"
        : "✨ Woche generieren";

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="week" value={week} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={() => setShowOptions((s) => !s)}
          className="rounded-full border border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {showOptions ? "Optionen verbergen" : "Optionen"}
        </button>
      </div>

      {showOptions && (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label
              htmlFor="useUpIngredients"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Zutaten zum Aufbrauchen (komma-separiert)
            </label>
            <input
              id="useUpIngredients"
              name="useUpIngredients"
              type="text"
              placeholder="z.B. Zucchini, Hähnchenschenkel, Spinat"
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Von
              <select
                name="startDay"
                defaultValue={String(minDay)}
                className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Bis
              <select
                name="endDay"
                defaultValue="6"
                className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-zinc-500">
              An den nicht gewählten Tagen ist kein Kochen geplant.
              {!nextWeek && minDay > 0
                ? " Vergangene Tage dieser Woche sind gesperrt."
                : ""}
            </span>
          </div>
        </div>
      )}

      {state.status === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}

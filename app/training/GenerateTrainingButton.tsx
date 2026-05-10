"use client";

import { useActionState, useState } from "react";
import {
  generateWeeklyTraining,
  type GenerateTrainingState,
} from "./actions";

export function GenerateTrainingButton({ hasPlan }: { hasPlan: boolean }) {
  const [state, action, pending] = useActionState<
    GenerateTrainingState,
    FormData
  >(generateWeeklyTraining, { status: "idle" });
  const [showOptions, setShowOptions] = useState(false);

  return (
    <form action={action} className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending
            ? "Claude plant..."
            : hasPlan
              ? "Woche neu generieren"
              : "✨ Woche generieren"}
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
        <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Kontext
            </span>
            <select
              name="contextPreference"
              defaultValue="mixed"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="mixed">Gemischt (Studio + Zuhause)</option>
              <option value="home">Nur Zuhause (kein Equipment)</option>
              <option value="gym">Nur Studio</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Trainingstage
            </span>
            <select
              name="daysPerWeek"
              defaultValue="auto"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="auto">Auto (Claude empfiehlt)</option>
              <option value="3">3 Tage</option>
              <option value="4">4 Tage</option>
              <option value="5">5 Tage</option>
              <option value="6">6 Tage</option>
            </select>
          </label>
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

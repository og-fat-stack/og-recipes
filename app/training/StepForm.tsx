"use client";

import { useActionState } from "react";
import { logSteps, type LogStepsState } from "./actions";

export function StepForm({ defaultSteps }: { defaultSteps?: number }) {
  const [state, action, pending] = useActionState<LogStepsState, FormData>(
    logSteps,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Schritte</span>
        <input
          name="steps"
          type="number"
          step="1"
          min="0"
          defaultValue={defaultSteps ?? ""}
          placeholder="z. B. 8500"
          required
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Datum</span>
        <input
          name="date"
          type="date"
          defaultValue={today}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Notiz</span>
        <input
          name="note"
          type="text"
          placeholder="optional"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Speichern..." : "Eintragen"}
      </button>
      {state.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">
          Gespeichert.
        </p>
      )}
    </form>
  );
}

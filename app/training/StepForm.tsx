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
        <span className="text-ink-muted">Schritte</span>
        <input
          name="steps"
          type="number"
          step="1"
          min="0"
          defaultValue={defaultSteps ?? ""}
          placeholder="z. B. 8500"
          required
          className="w-32 rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Datum</span>
        <input
          name="date"
          type="date"
          defaultValue={today}
          className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-ink-muted">Notiz</span>
        <input
          name="note"
          type="text"
          placeholder="optional"
          className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover disabled:opacity-50"
      >
        {pending ? "Speichern..." : "Eintragen"}
      </button>
      {state.error && (
        <p className="w-full text-sm text-danger-ink">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="w-full text-sm text-accent-ink">
          Gespeichert.
        </p>
      )}
    </form>
  );
}

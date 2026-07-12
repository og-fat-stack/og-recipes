"use client";

import { useActionState } from "react";
import { logWeight, type LogWeightState } from "./actions";

export function WeightForm({ defaultKg }: { defaultKg?: number }) {
  const [state, action, pending] = useActionState<LogWeightState, FormData>(
    logWeight,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">Gewicht (kg)</span>
        <input
          name="kg"
          type="number"
          step="0.1"
          defaultValue={defaultKg ?? ""}
          required
          className="w-28 rounded-control border border-line-strong bg-surface px-3 py-2 text-base"
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
    </form>
  );
}

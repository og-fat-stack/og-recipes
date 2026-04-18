"use client";

import { useActionState } from "react";
import { saveExpense, type SaveExpenseState } from "./actions";

export function ExpenseForm({
  defaultAmount,
  defaultNote,
}: {
  defaultAmount?: string;
  defaultNote?: string;
}) {
  const [state, action, pending] = useActionState<SaveExpenseState, FormData>(
    saveExpense,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Betrag (€)</span>
        <input
          name="amount"
          inputMode="decimal"
          defaultValue={defaultAmount ?? ""}
          required
          placeholder="42,30"
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Notiz</span>
        <input
          name="note"
          type="text"
          defaultValue={defaultNote ?? ""}
          placeholder="optional (z. B. Aldi + Markt)"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Speichern..." : "Speichern"}
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

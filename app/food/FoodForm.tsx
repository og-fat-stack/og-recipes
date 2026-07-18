"use client";

import { useActionState } from "react";
import { logFood, type LogFoodState } from "./actions";

/**
 * Freitext-Eingabe fürs Essens-Tracking. Claude schätzt kcal + Makros — der
 * Nutzer wartet auf die Antwort (einige Sekunden), daher klarer Pending-Text.
 */
export function FoodForm({ dateParam }: { dateParam: string }) {
  const [state, formAction, pending] = useActionState<LogFoodState, FormData>(
    logFood,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={dateParam} />
      <textarea
        name="text"
        rows={2}
        required
        maxLength={500}
        disabled={pending}
        placeholder="z. B. 2 Brötchen mit Butter und Gouda, dazu ein Cappuccino"
        className="w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base shadow-sm focus:border-contrast focus:outline-none disabled:opacity-60"
      />
      {state.error && <p className="text-sm text-danger-ink">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast transition-colors hover:bg-contrast-hover disabled:opacity-50"
        >
          {pending ? "Claude schätzt…" : "Eintragen"}
        </button>
        {pending && (
          <span className="text-sm text-ink-subtle">
            Nährwerte werden geschätzt — dauert ein paar Sekunden.
          </span>
        )}
      </div>
    </form>
  );
}

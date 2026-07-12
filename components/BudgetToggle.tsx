"use client";

import { useTransition } from "react";
import { toggleBudgetConscious } from "../app/profile/actions";

/**
 * Schalter: günstig einkaufen (an) oder ohne Budget-Einschränkung (aus). Wirkt
 * auf die nächste Plan- und Rezeptgenerierung.
 */
export function BudgetToggle({ budgetConscious }: { budgetConscious: boolean }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleBudgetConscious())}
      aria-pressed={budgetConscious}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium">Günstig einkaufen</span>
        <span className="text-xs text-zinc-500">
          {budgetConscious
            ? "An — Plan & Rezepte bevorzugen günstige Zutaten (< 3 €/Portion)"
            : "Aus — keine Budget-Einschränkung, Zutaten frei nach Geschmack/Qualität"}
        </span>
      </span>
      <span
        className={
          "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors " +
          (budgetConscious ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700")
        }
      >
        <span
          className={
            "h-5 w-5 rounded-full bg-white shadow transition-transform " +
            (budgetConscious ? "translate-x-5" : "")
          }
        />
      </span>
    </button>
  );
}

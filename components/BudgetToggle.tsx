"use client";

import { useTransition } from "react";
import { toggleBudgetConscious } from "../app/profile/actions";
import { Toggle } from "./Toggle";

/**
 * Schalter: günstig einkaufen (an) oder ohne Budget-Einschränkung (aus). Wirkt
 * auf die nächste Plan- und Rezeptgenerierung.
 */
export function BudgetToggle({ budgetConscious }: { budgetConscious: boolean }) {
  const [pending, start] = useTransition();

  return (
    <Toggle
      enabled={budgetConscious}
      pending={pending}
      onToggle={() => start(() => toggleBudgetConscious())}
      title="Günstig einkaufen"
      description={
        budgetConscious
          ? "An — Plan & Rezepte bevorzugen günstige Zutaten (< 3 €/Portion)"
          : "Aus — keine Budget-Einschränkung, Zutaten frei nach Geschmack/Qualität"
      }
    />
  );
}

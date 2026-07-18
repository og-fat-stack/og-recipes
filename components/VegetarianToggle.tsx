"use client";

import { useTransition } from "react";
import { toggleVegetarian } from "../app/profile/actions";
import { Toggle } from "./Toggle";

/**
 * Schalter: vegetarisch essen (an) oder mit Fleisch/Fisch (aus). Wirkt auf
 * die nächste Plan- und Rezeptgenerierung; Eier und Milchprodukte bleiben.
 */
export function VegetarianToggle({ vegetarian }: { vegetarian: boolean }) {
  const [pending, start] = useTransition();

  return (
    <Toggle
      enabled={vegetarian}
      pending={pending}
      onToggle={() => start(() => toggleVegetarian())}
      title="Vegetarisch"
      description={
        vegetarian
          ? "An — Plan & Rezepte ohne Fleisch und Fisch (Eier + Milchprodukte erlaubt)"
          : "Aus — Fleisch und Fisch erlaubt (innerhalb der DGE-Grenzen)"
      }
    />
  );
}

import type { Profile } from "./generated/prisma/client";
import { getLatestMeasurement } from "./measurements";
import { getCurrentPlan } from "./plan";
import { getWeightStats } from "./weight";
import { startOfDay } from "./time";

export type Routine = {
  key: string;
  label: string;
  /** Wie oft die Routine ansteht (Anzeige-Text). */
  cadence: string;
  /** Letzter Stand / Status-Text. */
  status: string;
  /** True = jetzt fällig (hervorheben). */
  due: boolean;
  href: string;
};

function daysAgo(date: Date): number {
  const ms = startOfDay().getTime() - startOfDay(date).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/**
 * Periodische Routinen, die NICHT in der täglichen Checkliste stehen
 * (Maße messen, Wochenplan, Makro-Neuberechnung). Wo möglich mit letztem
 * Stand und Fälligkeit aus den Daten.
 */
export async function getRoutines(profile: Profile | null): Promise<Routine[]> {
  const [measurement, plan, stats] = await Promise.all([
    getLatestMeasurement(),
    getCurrentPlan(),
    getWeightStats(
      profile?.goalWeightKg ?? null,
      0.4,
      profile?.lastMacroWeightKg ?? null,
    ),
  ]);

  const routines: Routine[] = [];

  const mDays = measurement ? daysAgo(measurement.date) : null;
  routines.push({
    key: "measure",
    label: "Taille & Maße messen",
    cadence: "alle 1–2 Wochen",
    status:
      mDays == null
        ? "noch nie gemessen"
        : `zuletzt vor ${mDays} ${mDays === 1 ? "Tag" : "Tagen"}`,
    due: mDays == null || mDays >= 14,
    href: "/measurements",
  });

  routines.push({
    key: "plan",
    label: "Wochenplan erstellen",
    cadence: "wöchentlich",
    status: plan ? "für diese Woche erstellt" : "fehlt für diese Woche",
    due: !plan,
    href: "/plan",
  });

  // Nur relevant, wenn tatsächlich fällig (kein fester Rhythmus).
  if (stats.needsMacroRefresh) {
    routines.push({
      key: "macros",
      label: "Makros neu berechnen",
      cadence: "bei ≥ 2 kg Abnahme",
      status: "über 2 kg seit letzter Berechnung",
      due: true,
      href: "/weight",
    });
  }

  // Fällige zuerst.
  return routines.sort((a, b) => Number(b.due) - Number(a.due));
}

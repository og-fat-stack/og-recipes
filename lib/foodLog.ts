import { db } from "./db";
import { startOfDay } from "./time";
import type { FoodItem } from "./ai/estimateFood";

export type FoodTotals = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

/** Berliner Kalendertag als "YYYY-MM-DD" (für Links/Inputs). */
export function dayParam(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

/**
 * "YYYY-MM-DD" → Berliner Tagesanfang. Ungültige/fehlende Werte → heute.
 * Mittag +02:00 liegt unabhängig von Sommer-/Winterzeit immer im richtigen
 * Berliner Kalendertag, danach normalisiert startOfDay auf Mitternacht.
 */
export function parseDayParam(v: string | undefined | null): Date {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T12:00:00+02:00`);
    if (!Number.isNaN(d.getTime())) return startOfDay(d);
  }
  return startOfDay();
}

export async function getFoodEntriesForDay(userId: number, day: Date) {
  return db.foodLogEntry.findMany({
    where: { userId, date: day },
    orderBy: { createdAt: "asc" },
  });
}

export function sumFoodEntries(
  entries: { kcal: number; proteinG: number; carbG: number; fatG: number }[],
): FoodTotals {
  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      proteinG: acc.proteinG + e.proteinG,
      carbG: acc.carbG + e.carbG,
      fatG: acc.fatG + e.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
  );
}

/** Items-Json eines Eintrags typisiert lesen. */
export function entryItems(items: unknown): FoodItem[] {
  return Array.isArray(items) ? (items as FoodItem[]) : [];
}

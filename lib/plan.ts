import { db } from "./db";
import { SNACK_CUISINE } from "./snacks";
import { addDays, startOfDay, weekStart } from "./time";

export { addDays, weekStart };

/** Welche Woche ein Plan betrifft: laufende oder kommende. */
export type WeekSel = "this" | "next";

/** Normalisiert einen (evtl. undefinierten) Query-/Form-Wert auf eine Woche. */
export function parseWeekSel(v: string | null | undefined): WeekSel {
  return v === "next" ? "next" : "this";
}

/** Montag (Berlin) der gewählten Woche. */
export function weekStartFor(sel: WeekSel): Date {
  const ws = weekStart();
  return sel === "next" ? addDays(ws, 7) : ws;
}

export const DAYS = [
  "Mo",
  "Di",
  "Mi",
  "Do",
  "Fr",
  "Sa",
  "So",
] as const;
/** Von Claude geplante Mahlzeiten-Slots. */
export const SLOTS = ["breakfast", "lunch", "dinner"] as const;
/**
 * Feste Snack-Slots (lib/snacks.ts) — von der App deterministisch belegt,
 * nicht von Claude. snack1 = vormittags, snack2 = nachmittags.
 */
export const SNACK_SLOTS = ["snack1", "snack2"] as const;
/** Alle Slots in Tagesreihenfolge (für die Anzeige). */
export const DISPLAY_SLOTS = [
  "breakfast",
  "snack1",
  "lunch",
  "snack2",
  "dinner",
] as const;
export type Slot = (typeof DISPLAY_SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  breakfast: "Frühstück",
  snack1: "Snack",
  lunch: "Mittag",
  snack2: "Snack",
  dinner: "Abend",
};

export function isSnackSlot(slot: string): boolean {
  return (SNACK_SLOTS as readonly string[]).includes(slot);
}

export async function getPlanForWeek(userId: number, ws: Date) {
  return db.mealPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart: ws } },
    include: {
      meals: {
        include: { recipe: true },
        orderBy: [{ day: "asc" }, { slot: "asc" }],
      },
    },
  });
}

export async function getCurrentPlan(userId: number) {
  return getPlanForWeek(userId, weekStart());
}

/**
 * Länger als das kann der Hintergrund-Job nicht laufen (Vercel bricht nach
 * maxDuration = 300 s ab). Eine ältere "generating"-Zeile ist ein
 * abgebrochener Job und darf weder "läuft noch" anzeigen noch blockieren.
 */
const STALE_AFTER_MS = 10 * 60 * 1000;

export function isStaleGeneration(row: { status: string; updatedAt: Date }): boolean {
  return row.status === "generating" && Date.now() - row.updatedAt.getTime() > STALE_AFTER_MS;
}

export type PlanGenerationStatus = {
  status: "generating" | "error";
  error: string | null;
};

/**
 * Läuft (oder scheiterte zuletzt) eine Hintergrund-Generierung für diese Woche?
 * Existiert nur während der Generierung / nach einem Fehler — bei Erfolg wird
 * die Zeile in app/plan/actions.ts wieder gelöscht (siehe dort, `after()`).
 */
export async function getPlanGeneration(
  userId: number,
  ws: Date,
): Promise<PlanGenerationStatus | null> {
  const row = await db.planGeneration.findUnique({
    where: { userId_weekStart: { userId, weekStart: ws } },
  });
  if (!row) return null;
  if (isStaleGeneration(row)) {
    return {
      status: "error",
      error: "Die Generierung wurde wegen Zeitüberschreitung abgebrochen.",
    };
  }
  return {
    status: row.status === "error" ? "error" : "generating",
    error: row.error,
  };
}

export async function getRecentMealTitles(
  userId: number,
  daysBack = 14,
  /** Woche, die gerade neu geplant (also ersetzt) wird — zählt nicht mit. */
  excludeWeekStart?: Date,
): Promise<string[]> {
  const since = addDays(startOfDay(), -daysBack);
  const plans = await db.mealPlan.findMany({
    where: {
      userId,
      weekStart: excludeWeekStart ? { gte: since, not: excludeWeekStart } : { gte: since },
    },
    include: {
      meals: { include: { recipe: { select: { title: true, cuisine: true } } } },
    },
  });
  const titles = new Set<string>();
  for (const p of plans)
    for (const m of p.meals)
      // Feste Snacks sind keine "kürzlich gegessenen Gerichte" für den Prompt.
      if (m.recipe.cuisine !== SNACK_CUISINE && m.recipe.cuisine !== "Beilage")
        titles.add(m.recipe.title);
  return Array.from(titles);
}

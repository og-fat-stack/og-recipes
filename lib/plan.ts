import { db } from "./db";
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
export const SLOTS = ["breakfast", "lunch", "dinner"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  breakfast: "Frühstück",
  lunch: "Mittag",
  dinner: "Abend",
};

export async function getPlanForWeek(ws: Date) {
  return db.mealPlan.findUnique({
    where: { weekStart: ws },
    include: {
      meals: {
        include: { recipe: true },
        orderBy: [{ day: "asc" }, { slot: "asc" }],
      },
    },
  });
}

export async function getCurrentPlan() {
  return getPlanForWeek(weekStart());
}

/**
 * Pick known main-meal batch recipes to reuse in next week's plan.
 * "Main-meal" = portions >= 3 and cuisine != "Frühstück".
 * Preference: recipes NOT used in the recent window (to rotate), oldest-updated first.
 * Falls back to least-recently-updated if not enough candidates.
 */
export async function pickKnownMainMealRecipes(
  desired: number,
  recentDays = 14,
): Promise<{ id: number; title: string; portions: number; kcalPerPortion: number; proteinG: number; carbG: number; fatG: number; ingredients: unknown; steps: unknown; techniques: unknown; batchStorageDays: number; cuisine: string; notes: string | null }[]> {
  const recentTitles = new Set(await getRecentMealTitles(recentDays));

  const pool = await db.recipe.findMany({
    where: {
      portions: { gte: 3 },
      NOT: { cuisine: "Frühstück" },
    },
    orderBy: { updatedAt: "asc" },
  });

  const fresh = pool.filter((r) => !recentTitles.has(r.title));
  const picked = (fresh.length >= desired ? fresh : pool).slice(0, desired);
  return picked;
}

export async function getRecentMealTitles(daysBack = 14): Promise<string[]> {
  const since = addDays(startOfDay(), -daysBack);
  const plans = await db.mealPlan.findMany({
    where: { weekStart: { gte: since } },
    include: { meals: { include: { recipe: { select: { title: true } } } } },
  });
  const titles = new Set<string>();
  for (const p of plans)
    for (const m of p.meals) titles.add(m.recipe.title);
  return Array.from(titles);
}

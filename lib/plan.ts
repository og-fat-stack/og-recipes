import { db } from "./db";

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

/** Monday of the week containing `d`, at local 00:00. */
export function weekStart(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export async function getCurrentPlan() {
  const ws = weekStart();
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
  const since = new Date();
  since.setDate(since.getDate() - recentDays);

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
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  since.setHours(0, 0, 0, 0);
  const plans = await db.mealPlan.findMany({
    where: { weekStart: { gte: since } },
    include: { meals: { include: { recipe: { select: { title: true } } } } },
  });
  const titles = new Set<string>();
  for (const p of plans)
    for (const m of p.meals) titles.add(m.recipe.title);
  return Array.from(titles);
}

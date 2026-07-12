import { db } from "./db";
import { startOfDay } from "./time";

export type WeightStats = {
  latestKg: number | null;
  latestDate: Date | null;
  rollingAvg7: number | null;
  rollingAvg7Prev: number | null;
  weeklyDeltaKg: number | null;
  totalLostKg: number | null;
  etaWeeks: number | null;
  etaDate: Date | null;
  needsMacroRefresh: boolean;
};

/** Berlin-local start-of-day (so one entry per calendar day). */
export function dayKey(d: Date = new Date()): Date {
  return startOfDay(d);
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function getWeightEntries(userId: number, limit = 90) {
  return db.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

/**
 * Compute trend stats. Uses:
 * - rolling 7-day average (current window: last 7 entries with date >= today-6d)
 * - previous 7-day average (entries from 7..13 days ago)
 * - weekly delta = current avg - previous avg
 * - ETA: (avg - goal) / weekly fat-loss rate
 *
 * We use the recent weekly delta as the rate when it's negative (shows real
 * progress); otherwise fall back to the theoretical rate implied by the user's
 * kcal deficit (~0.4 kg/week at -500 kcal).
 */
export async function getWeightStats(
  userId: number,
  goalWeightKg: number | null,
  assumedWeeklyLossKg = 0.4,
  lastMacroWeightKg: number | null = null,
): Promise<WeightStats> {
  const entries = await db.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  const latest = entries[0] ?? null;
  const now = dayKey();
  const ms = 24 * 60 * 60 * 1000;

  const recent = entries.filter(
    (e) => now.getTime() - e.date.getTime() <= 6 * ms,
  );
  const prev = entries.filter((e) => {
    const diff = now.getTime() - e.date.getTime();
    return diff >= 7 * ms && diff <= 13 * ms;
  });

  const rollingAvg7 = avg(recent.map((e) => e.kg));
  const rollingAvg7Prev = avg(prev.map((e) => e.kg));

  const weeklyDeltaKg =
    rollingAvg7 != null && rollingAvg7Prev != null
      ? rollingAvg7 - rollingAvg7Prev
      : null;

  const first = entries[entries.length - 1];
  const totalLostKg =
    first && latest ? Math.max(0, first.kg - latest.kg) : null;

  let etaWeeks: number | null = null;
  let etaDate: Date | null = null;
  if (rollingAvg7 != null && goalWeightKg != null) {
    const toLose = rollingAvg7 - goalWeightKg;
    if (toLose > 0) {
      const rate =
        weeklyDeltaKg != null && weeklyDeltaKg < 0
          ? -weeklyDeltaKg
          : assumedWeeklyLossKg;
      etaWeeks = Math.ceil(toLose / rate);
      etaDate = new Date(now.getTime() + etaWeeks * 7 * ms);
    }
  }

  // Refresh macros if current avg has dropped >= 2 kg since last macro calc.
  const needsMacroRefresh =
    rollingAvg7 != null &&
    lastMacroWeightKg != null &&
    lastMacroWeightKg - rollingAvg7 >= 2;

  return {
    latestKg: latest?.kg ?? null,
    latestDate: latest?.date ?? null,
    rollingAvg7,
    rollingAvg7Prev,
    weeklyDeltaKg,
    totalLostKg,
    etaWeeks,
    etaDate,
    needsMacroRefresh,
  };
}

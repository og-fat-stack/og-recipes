import { db } from "./db";
import { dayKey } from "./weight";

/** Tagesziel-Korridor für Schritte (siehe Training-Empfehlung). */
export const STEP_GOAL_MIN = 8000;
export const STEP_GOAL_MAX = 10000;

export type StepStats = {
  todaySteps: number | null;
  latestSteps: number | null;
  latestDate: Date | null;
  rollingAvg7: number | null;
  /** Tage der letzten 7 mit ≥ STEP_GOAL_MIN Schritten. */
  goalDays7: number;
  loggedDays7: number;
};

/**
 * NETTO-Gehverbrauch für eine Schrittzahl (über den Ruheumsatz hinaus, der im
 * TDEE bereits steckt). ~0,71 m pro Schritt, Netto-Gehen ≈ 0,5 kcal pro kg und
 * km. Bei 81 kg sind 8.000 Schritte also grob ~230 kcal.
 */
export function stepsKcal(steps: number, weightKg: number): number {
  if (steps <= 0 || weightKg <= 0) return 0;
  const km = (steps * 0.71) / 1000;
  return Math.round(0.5 * weightKg * km);
}

export async function getStepEntries(userId: number, limit = 60) {
  return db.stepEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function getStepStats(userId: number): Promise<StepStats> {
  const entries = await db.stepEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  const today = dayKey();
  const ms = 24 * 60 * 60 * 1000;

  const todayEntry = entries.find((e) => e.date.getTime() === today.getTime());

  const recent = entries.filter(
    (e) => today.getTime() - e.date.getTime() <= 6 * ms,
  );

  return {
    todaySteps: todayEntry?.steps ?? null,
    latestSteps: entries[0]?.steps ?? null,
    latestDate: entries[0]?.date ?? null,
    rollingAvg7: avg(recent.map((e) => e.steps)),
    goalDays7: recent.filter((e) => e.steps >= STEP_GOAL_MIN).length,
    loggedDays7: recent.length,
  };
}

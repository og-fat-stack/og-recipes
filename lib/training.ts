import { db } from "./db";
import { computeMacros, type ActivityLevel, type Goal, type Sex } from "./macros";
import { addDays, weekStart } from "./time";

export { addDays, weekStart };
export { DAYS } from "./plan";

export const CONTEXTS = ["home", "gym"] as const;
export type TrainingContext = (typeof CONTEXTS)[number];

export const CONTEXT_LABELS: Record<TrainingContext, string> = {
  home: "Zuhause",
  gym: "Studio",
};

export const FOCUSES = [
  "push",
  "pull",
  "legs",
  "full_body",
  "hiit",
  "mobility",
] as const;
export type TrainingFocus = (typeof FOCUSES)[number];

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Beine",
  full_body: "Ganzkörper",
  hiit: "HIIT",
  mobility: "Mobility",
};

export type ExerciseEntry = {
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  equipment: string;
  notes?: string | null;
};

export async function getCurrentTrainingPlan() {
  return db.trainingPlan.findUnique({
    where: { weekStart: weekStart() },
    include: { sessions: { orderBy: { day: "asc" } } },
  });
}

export async function getActiveWorkoutKcalWeekly(): Promise<number> {
  const plan = await getCurrentTrainingPlan();
  return plan?.sessions.reduce((s, x) => s + x.kcalEstimate, 0) ?? 0;
}

/**
 * Recompute the profile's kcal/macros from current weight + the active week's
 * training burn, then persist. Called whenever the training plan changes so the
 * meal-plan kcalTarget stays in sync.
 */
export async function recomputeProfileMacros(): Promise<void> {
  const profile = await db.profile.findUnique({ where: { id: 1 } });
  if (!profile) return;

  const workoutKcalWeekly = await getActiveWorkoutKcalWeekly();
  const macros = computeMacros({
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    age: profile.age,
    sex: profile.sex as Sex,
    activityLevel: profile.activityLevel as ActivityLevel,
    goal: profile.goal as Goal,
    workoutKcalWeekly,
  });

  await db.profile.update({
    where: { id: 1 },
    data: {
      kcalTarget: macros.kcalTarget,
      proteinG: macros.proteinG,
      carbG: macros.carbG,
      fatG: macros.fatG,
      waterMlTarget: macros.waterMlTarget,
      workoutKcalWeekly,
    },
  });
}

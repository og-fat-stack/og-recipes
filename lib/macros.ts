export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "cut" | "maintain" | "gain";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_DELTA: Record<Goal, number> = {
  cut: -500,
  maintain: 0,
  gain: 300,
};

export type MacroInput = {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
  workoutKcalWeekly?: number;
};

export type MacroTargets = {
  bmr: number;
  tdee: number;
  kcalTarget: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  waterMlTarget: number;
};

/** Mifflin-St Jeor BMR. */
export function bmr({ heightCm, weightKg, age, sex }: MacroInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function computeMacros(input: MacroInput): MacroTargets {
  const bmrVal = Math.round(bmr(input));
  const tdee = Math.round(bmrVal * ACTIVITY_MULTIPLIER[input.activityLevel]);

  // Hormonal-safe kcal floor: never below BMR, and never below the sex-specific
  // minimum (1500 male / 1200 female). Eating under BMR chronically suppresses
  // T3/thyroid, leptin, and sex hormone production.
  const sexFloor = input.sex === "female" ? 1200 : 1500;
  const kcalFloor = Math.max(bmrVal, sexFloor);
  const rawTarget = tdee + GOAL_DELTA[input.goal];
  // Workout burn is folded in as a flat per-day bump (weekly / 7) so eating
  // targets stay stable across the week instead of spiking on training days.
  const workoutBump = Math.round((input.workoutKcalWeekly ?? 0) / 7);
  const kcalTarget = Math.max(kcalFloor, rawTarget + workoutBump);

  // Protein: 2 g per kg (muscle retention on a cut).
  const proteinG = Math.round(input.weightKg * 2);

  // Fat floor: the LARGER of
  //   - 25% of kcal (standard AMDR midpoint), and
  //   - absolute hormonal minimum (0.8 g/kg men, 1.0 g/kg women)
  // This protects testosterone / estrogen / progesterone synthesis when kcal
  // is low or bodyweight is high relative to target kcal.
  const fatGPerKgFloor = input.sex === "female" ? 1.0 : 0.8;
  const fatFromPct = Math.round((kcalTarget * 0.25) / 9);
  const fatFromBodyweight = Math.round(input.weightKg * fatGPerKgFloor);
  const fatG = Math.max(fatFromPct, fatFromBodyweight);

  // Carbs fill the remainder at 4 kcal/g, floored at 0.
  const carbG = Math.max(
    0,
    Math.round((kcalTarget - proteinG * 4 - fatG * 9) / 4),
  );

  // Water: 35 ml/kg (rounded to nearest 100 ml).
  const waterMlTarget = Math.round((input.weightKg * 35) / 100) * 100;

  return {
    bmr: bmrVal,
    tdee,
    kcalTarget,
    proteinG,
    carbG,
    fatG,
    waterMlTarget,
  };
}

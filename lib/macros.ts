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
  bodyFatPct?: number;
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

/** Mifflin-St Jeor BMR (weight-based). */
export function bmrMifflin({
  heightCm,
  weightKg,
  age,
  sex,
}: MacroInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Katch-McArdle BMR (lean-mass-based). More accurate when body-fat % is known. */
export function bmrKatchMcArdle(leanMassKg: number): number {
  return 370 + 21.6 * leanMassKg;
}

/** @deprecated kept as an alias for backwards compatibility — use bmrMifflin. */
export const bmr = bmrMifflin;

export function computeMacros(input: MacroInput): MacroTargets {
  const mifflin = bmrMifflin(input);

  // BMR: Katch-McArdle when body-fat % is known, with a ±20% Mifflin sanity
  // clamp so a wildly wrong BF% input can't blow up kcal. Outside the clamp,
  // fall back to Mifflin.
  let bmrVal = mifflin;
  let leanKg: number | null = null;
  if (input.bodyFatPct != null) {
    leanKg = input.weightKg * (1 - input.bodyFatPct / 100);
    const km = bmrKatchMcArdle(leanKg);
    if (km >= mifflin * 0.8 && km <= mifflin * 1.2) bmrVal = km;
  }
  bmrVal = Math.round(bmrVal);

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

  // Protein. With BF% known: 2.4 g/kg lean body mass (Helms 2014 cutting
  // midpoint of 2.3–3.1 g/kg LBM). Cap at 2 g/kg total + 25 g so an
  // unrealistically low BF% can't produce absurd protein. Without BF%:
  // unchanged 2 g/kg total weight.
  const proteinG =
    leanKg != null
      ? Math.round(
          Math.min(leanKg * 2.4, input.weightKg * 2 + 25),
        )
      : Math.round(input.weightKg * 2);

  // Fat floor: the LARGER of
  //   - 25% of kcal (standard AMDR midpoint), and
  //   - absolute hormonal minimum.
  // With BF% known: per-kg LBM (men 1.0 / women 1.2) which protects hormones
  // for higher-BF users without overshooting for lean users. Without BF%:
  // legacy per-kg total weight (men 0.8 / women 1.0).
  const fatFromPct = Math.round((kcalTarget * 0.25) / 9);
  const fatFromBody =
    leanKg != null
      ? Math.round(leanKg * (input.sex === "female" ? 1.2 : 1.0))
      : Math.round(input.weightKg * (input.sex === "female" ? 1.0 : 0.8));
  const fatG = Math.max(fatFromPct, fatFromBody);

  // Carbs fill the remainder at 4 kcal/g, floored at 0.
  const carbG = Math.max(
    0,
    Math.round((kcalTarget - proteinG * 4 - fatG * 9) / 4),
  );

  // Water: 35 ml/kg total weight (rounded to nearest 100 ml).
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

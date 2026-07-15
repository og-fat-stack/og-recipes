/** Tagesziel-Korridor für Schritte (siehe Training-Empfehlung). */
export const STEP_GOAL_MIN = 8000;
export const STEP_GOAL_MAX = 10000;

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

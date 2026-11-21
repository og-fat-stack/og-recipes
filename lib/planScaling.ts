/**
 * Passt einen Wochenplan aus ECHTEN Rezepten an die Tagesziele an, ohne ein
 * Rezept zu verändern: pro Mahlzeit nur die Portionsgröße (Faktor) und bei
 * Eiweiß-Lücken eine feste Beilage aus lib/sides.ts. Rein rechnerisch, ohne
 * Claude — exportiert für Tests.
 */

export type Macros = { kcal: number; protein: number; carb: number; fat: number };
export type MealSlot = "breakfast" | "lunch" | "dinner";

export type Pick = { day: number; slot: MealSlot; recipe: Macros };

export type SideOption = Macros & { key: string; fits: ("breakfast" | "main")[] };

export type ScaledMeal = {
  day: number;
  slot: MealSlot;
  /** Portionen dieses Rezepts für diese Mahlzeit (z. B. 1.25). */
  factor: number;
  side?: { key: string; units: number };
};

export const MIN_FACTOR = 0.5;
export const MAX_FACTOR = 2.5;
/** Mit Beilage bleibt vom Rezept mindestens eine Dreiviertel-Portion. */
const MIN_FACTOR_WITH_SIDE = 0.75;
const STEP = 0.25;
/** Eiweiß der Mahlzeiten soll mindestens so viel vom Mahlzeiten-Ziel treffen. */
const PROTEIN_GOAL = 0.95;
const KCAL_TOLERANCE = 0.15;
const PROTEIN_FLOOR = 0.85;

export function roundFactor(x: number): number {
  const r = Math.round(x / STEP) * STEP;
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, r));
}

function proteinDensity(m: Macros): number {
  return m.kcal > 0 ? m.protein / m.kcal : 0;
}

/**
 * Skaliert die Mahlzeiten jedes Tages so, dass sie zusammen das
 * Mahlzeiten-Ziel (Tagesziel minus feste Snacks) treffen, und füllt
 * Eiweiß-Lücken mit Beilagen.
 */
export function scalePlan(args: {
  picks: Pick[];
  /** Tag → Ziel für die 3 Mahlzeiten zusammen (ohne Snacks). */
  mealTargets: Map<number, { kcal: number; protein: number }>;
  sides: SideOption[];
}): ScaledMeal[] {
  const byDay = new Map<number, Pick[]>();
  for (const p of args.picks) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);

  const out: ScaledMeal[] = [];
  for (const [day, picks] of byDay) {
    const target = args.mealTargets.get(day);
    if (!target) continue;
    const slotKcal = target.kcal / picks.length;
    const meals = picks.map((p) => ({
      pick: p,
      budget: slotKcal,
      factor: roundFactor(slotKcal / Math.max(1, p.recipe.kcal)),
      side: undefined as { key: string; units: number; option: SideOption } | undefined,
    }));

    const protein = () =>
      meals.reduce(
        (s, m) => s + m.factor * m.pick.recipe.protein + (m.side ? m.side.units * m.side.option.protein : 0),
        0,
      );

    // Eiweiß-Lücke: Beilage zur eiweißärmsten Mahlzeit, deren Kalorien von
    // deren Portion abgezogen werden (Tageskalorien bleiben gleich).
    for (let round = 0; round < meals.length; round++) {
      const gap = PROTEIN_GOAL * target.protein - protein();
      if (gap <= 4) break;
      const meal = meals
        .filter((m) => !m.side)
        .sort((a, b) => proteinDensity(a.pick.recipe) - proteinDensity(b.pick.recipe))[0];
      if (!meal) break;
      const kind = meal.pick.slot === "breakfast" ? "breakfast" : "main";
      const option = args.sides
        .filter((s) => s.fits.includes(kind))
        .sort((a, b) => proteinDensity(b) - proteinDensity(a))[0];
      if (!option) break;
      // Eine Einheit pro Mahlzeit (z. B. 150 g Skyr) — mehr wäre kein
      // Beilagen-Klecks mehr, sondern ein zweites Essen. Das Rezept bleibt
      // mindestens eine Dreiviertel-Portion; reicht das nicht, muss Claude
      // eiweißreichere Rezepte wählen (validateTotals meldet es).
      const units = 1;
      meal.side = { key: option.key, units, option };
      meal.factor = Math.max(
        MIN_FACTOR_WITH_SIDE,
        roundFactor((meal.budget - units * option.kcal) / Math.max(1, meal.pick.recipe.kcal)),
      );
    }

    for (const m of meals) {
      out.push({
        day,
        slot: m.pick.slot,
        factor: m.factor,
        side: m.side ? { key: m.side.key, units: m.side.units } : undefined,
      });
    }
  }
  return out;
}

/** Tagessummen eines skalierten Plans inklusive Beilagen und fester Snacks. */
export function dayTotals(args: {
  picks: Pick[];
  scaled: ScaledMeal[];
  sides: SideOption[];
  snackMacrosByDay?: Map<number, Macros>;
}): Map<number, Macros> {
  const sideByKey = new Map(args.sides.map((s) => [s.key, s]));
  const scaledBy = new Map(args.scaled.map((s) => [`${s.day}-${s.slot}`, s]));
  const totals = new Map<number, Macros>();
  const add = (day: number, m: Macros, f: number) => {
    const t = totals.get(day) ?? { kcal: 0, protein: 0, carb: 0, fat: 0 };
    t.kcal += m.kcal * f;
    t.protein += m.protein * f;
    t.carb += m.carb * f;
    t.fat += m.fat * f;
    totals.set(day, t);
  };
  for (const p of args.picks) {
    const s = scaledBy.get(`${p.day}-${p.slot}`);
    add(p.day, p.recipe, s?.factor ?? 1);
    const side = s?.side ? sideByKey.get(s.side.key) : undefined;
    if (side && s?.side) add(p.day, side, s.side.units);
  }
  for (const [day, m] of args.snackMacrosByDay ?? []) if (totals.has(day)) add(day, m, 1);
  for (const t of totals.values()) {
    t.kcal = Math.round(t.kcal);
    t.protein = Math.round(t.protein);
    t.carb = Math.round(t.carb);
    t.fat = Math.round(t.fat);
  }
  return totals;
}

/**
 * Trifft der skalierte Plan die Tagesziele? Kalorien ±15 %, Eiweiß mindestens
 * 85 % (Überschuss ist ok). Liefert eine Problembeschreibung für Claude oder null.
 */
export function validateTotals(
  totals: Map<number, Macros>,
  kcalTarget: number,
  proteinTarget: number,
): string | null {
  const problems: string[] = [];
  for (const [day, t] of [...totals.entries()].sort((a, b) => a[0] - b[0])) {
    const dev = (t.kcal - kcalTarget) / kcalTarget;
    if (Math.abs(dev) > KCAL_TOLERANCE) {
      problems.push(
        `Tag ${day}: ${t.kcal} kcal (Ziel ${kcalTarget}) — selbst mit angepassten Portionen (0,5–2,5) nicht erreichbar`,
      );
    }
    if (t.protein < PROTEIN_FLOOR * proteinTarget) {
      problems.push(
        `Tag ${day}: nur ${t.protein} g Eiweiß trotz Beilage (mindestens ${Math.round(PROTEIN_FLOOR * proteinTarget)} g)`,
      );
    }
  }
  return problems.length ? problems.join("; ") : null;
}

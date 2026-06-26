import type { Ingredient } from "./recipe";

/**
 * Hard kitchen constraint (also stored in the editable Claude-Memory):
 * Töpfe/Pfannen sind klein — es passen maximal 3 Hähnchenschenkel auf einmal,
 * sowohl zum Anbraten als auch zum Schmoren. Größere Mengen müssen über mehrere
 * Tage verteilt zubereitet werden (eine Schmor-/Brat-Runde pro Tag).
 */
export const MAX_THIGHS_PER_BATCH = 3;

// Mengenangaben mit Gewichts-/Volumeneinheit sind keine Stückzahl — dann lässt
// sich die Anzahl Schenkel nicht ableiten und wir splitten lieber nicht.
const MASS_OR_VOLUME_UNIT = /^(g|gr|gramm|kg|ml|l|liter|dl|cl)$/i;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ß", "ss");
}

// Hähnchen-/Hühnerschenkel, -keulen, -oberschenkel, -unterschenkel.
const CHICKEN_THIGH = /(hahnchen|huhner|huhnchen|haehnchen).*(schenkel|keule)/;

/**
 * Zählt die Hähnchenschenkel (Stück) in einer Zutatenliste. 0, wenn keine
 * vorkommen oder die Menge nur als Gewicht angegeben ist (dann keine Stückzahl).
 */
export function chickenThighCount(ingredients: Ingredient[]): number {
  let count = 0;
  for (const ing of ingredients) {
    if (!CHICKEN_THIGH.test(normalize(ing.name))) continue;
    const unit = (ing.unit ?? "").trim();
    if (MASS_OR_VOLUME_UNIT.test(unit)) continue; // keine Stückzahl ableitbar
    const qty = ing.qty;
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
      count += Math.round(qty);
    }
  }
  return count;
}

export type CookSessionPlanEntry = {
  /** 0 = heute, 1 = morgen, … */
  dayOffset: number;
  portionsMade: number;
  thighs: number;
};

/**
 * Bestimmt deterministisch, auf wie viele Kochsessions (über aufeinanderfolgende
 * Tage) die Zubereitung aufgeteilt werden muss. Passen alle Schenkel in einen
 * Durchgang (≤ 3) oder sind keine enthalten, ist es genau eine Session heute.
 * Sonst: eine Schmor-/Brat-Runde mit ≤ 3 Schenkeln pro Tag, Portionen so
 * gleichmäßig wie möglich auf die Tage verteilt.
 */
export function planCookSessions(recipe: {
  portions: number;
  ingredients: Ingredient[];
}): CookSessionPlanEntry[] {
  const portions = Math.max(1, Math.round(recipe.portions));
  const thighs = chickenThighCount(recipe.ingredients);

  if (thighs <= MAX_THIGHS_PER_BATCH) {
    return [{ dayOffset: 0, portionsMade: portions, thighs }];
  }

  const sessions = Math.ceil(thighs / MAX_THIGHS_PER_BATCH);

  // Portionen gleichmäßig verteilen (frühe Tage bekommen den Rest).
  const basePortions = Math.floor(portions / sessions);
  const portionRemainder = portions % sessions;

  // Schenkel auf ≤ 3 pro Tag verteilen (frühe Tage zuerst voll).
  let thighsLeft = thighs;

  const plan: CookSessionPlanEntry[] = [];
  for (let i = 0; i < sessions; i++) {
    const thighsThisDay = Math.min(MAX_THIGHS_PER_BATCH, thighsLeft);
    thighsLeft -= thighsThisDay;
    plan.push({
      dayOffset: i,
      portionsMade: basePortions + (i < portionRemainder ? 1 : 0),
      thighs: thighsThisDay,
    });
  }
  return plan;
}

/** True, wenn die Zubereitung über mehr als einen Tag verteilt werden muss. */
export function requiresMultiDayPrep(recipe: {
  portions: number;
  ingredients: Ingredient[];
}): boolean {
  return planCookSessions(recipe).length > 1;
}

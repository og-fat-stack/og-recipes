import { db } from "./db";
import { getBlsFood } from "./bls";
import type { Ingredient } from "./recipe";

/**
 * Feste Beilagen-Bibliothek für den Wochenplan. Reicht das Eiweiß eines Tages
 * mit den ausgewählten (echten, unveränderten) Rezepten nicht, legt die App
 * eine dieser einfachen Beilagen zu einer Mahlzeit dazu — das Rezept selbst
 * bleibt unangetastet. Die Nährwerte kommen direkt aus dem BLS (Code + Gramm),
 * nicht von Claude.
 */
export const SIDE_CUISINE = "Beilage";

type SideIngredient = { name: string; grams: number; bls: string; qty: number; unit: string };

type SideSpec = {
  key: string;
  title: string;
  /** Wozu passt die Beilage? */
  fits: ("breakfast" | "main")[];
  ingredients: SideIngredient[];
  steps: string[];
};

const SPECS: SideSpec[] = [
  {
    key: "skyr",
    title: "Skyr natur (150 g)",
    fits: ["breakfast", "main"],
    ingredients: [{ name: "Skyr natur", grams: 150, bls: "M710100", qty: 150, unit: "g" }],
    steps: ["150 g Skyr in eine Schale geben — pur, mit Zimt oder als kühler Klecks zum Essen."],
  },
  {
    key: "kraeuterquark",
    title: "Kräuterquark (150 g Magerquark)",
    fits: ["main"],
    ingredients: [
      { name: "Magerquark", grams: 150, bls: "M713100", qty: 150, unit: "g" },
      { name: "Petersilie oder Schnittlauch, gehackt", grams: 5, bls: "G250100", qty: 1, unit: "EL" },
    ],
    steps: [
      "150 g Magerquark mit 1 EL gehackten Kräutern, einer Prise Salz und etwas Wasser glatt rühren.",
    ],
  },
  {
    key: "eier",
    title: "2 gekochte Eier",
    fits: ["breakfast", "main"],
    ingredients: [{ name: "Eier", grams: 110, bls: "E111100", qty: 2, unit: "Stück" }],
    steps: ["2 Eier in kochendes Wasser legen, 8 Minuten kochen, kalt abschrecken und pellen."],
  },
  {
    key: "huettenkaese",
    title: "Hüttenkäse (150 g)",
    fits: ["breakfast", "main"],
    ingredients: [
      { name: "Körniger Frischkäse (Hüttenkäse)", grams: 150, bls: "M711100", qty: 150, unit: "g" },
    ],
    steps: ["150 g körnigen Frischkäse mit etwas Pfeffer anrichten."],
  },
  {
    key: "edamame",
    title: "Edamame (100 g, TK)",
    fits: ["main"],
    ingredients: [
      { name: "Edamame, geschält (TK)", grams: 100, bls: "G750100", qty: 100, unit: "g" },
    ],
    steps: ["100 g TK-Edamame 4 Minuten in Salzwasser kochen, abgießen und leicht salzen."],
  },
];

export type SideDef = {
  key: string;
  title: string;
  fits: ("breakfast" | "main")[];
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  ingredients: Ingredient[];
  steps: string[];
};

let cache: SideDef[] | null = null;

/** Beilagen mit aus dem BLS berechneten Nährwerten pro Einheit. */
export function getSides(): SideDef[] {
  if (cache) return cache;
  cache = SPECS.map((s) => {
    const m = { kcal: 0, protein: 0, carb: 0, fat: 0 };
    for (const ing of s.ingredients) {
      const food = getBlsFood(ing.bls);
      if (!food) throw new Error(`BLS-Code ${ing.bls} fehlt (Beilage ${s.key})`);
      const f = ing.grams / 100;
      m.kcal += food.kcal * f;
      m.protein += food.protein * f;
      m.carb += food.carb * f;
      m.fat += food.fat * f;
    }
    return {
      key: s.key,
      title: s.title,
      fits: s.fits,
      kcal: Math.round(m.kcal),
      protein: Math.round(m.protein),
      carb: Math.round(m.carb),
      fat: Math.round(m.fat),
      ingredients: s.ingredients.map(({ name, qty, unit, grams, bls }) => ({
        name,
        qty,
        unit,
        grams,
        bls,
      })),
      steps: s.steps,
    };
  });
  return cache;
}

/** Plan-Slot einer Beilage zu einer Mahlzeit, z. B. "lunch_side". */
export function sideSlotFor(slot: string): string {
  return `${slot}_side`;
}

export function isSideSlot(slot: string): boolean {
  return slot.endsWith("_side");
}

/**
 * Legt die verwendeten Beilagen als Rezepte des Nutzers an (cuisine
 * "Beilage") bzw. gleicht sie ab, damit Einkaufsliste und Plan-Anzeige wie bei
 * jedem anderen Rezept funktionieren. Liefert key → recipeId.
 */
export async function upsertSideRecipes(
  userId: number,
  keys: string[],
): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const side of getSides()) {
    if (!keys.includes(side.key) || ids.has(side.key)) continue;
    const data = {
      cuisine: SIDE_CUISINE,
      mealType: "side",
      portions: 1,
      kcalPerPortion: side.kcal,
      proteinG: side.protein,
      carbG: side.carb,
      fatG: side.fat,
      batchStorageDays: 1,
      ingredients: side.ingredients,
      steps: side.steps,
      techniques: [],
      macroSource: "bls-fixed",
      macroCoverage: 100,
    };
    const existing = await db.recipe.findFirst({
      where: { userId, title: side.title, cuisine: SIDE_CUISINE },
      select: { id: true },
    });
    const row = existing
      ? await db.recipe.update({ where: { id: existing.id }, data })
      : await db.recipe.create({ data: { userId, title: side.title, ...data } });
    ids.set(side.key, row.id);
  }
  return ids;
}

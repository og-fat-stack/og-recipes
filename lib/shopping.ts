import { db } from "./db";
import type { Ingredient } from "./recipe";
import { weekStart } from "./plan";

export type Aisle =
  | "obst_gemuese"
  | "fleisch_fisch"
  | "milchprodukte"
  | "trockenware"
  | "gewuerze"
  | "oele_essig"
  | "tiefkuehl"
  | "sonstiges";

export const AISLE_LABELS: Record<Aisle, string> = {
  obst_gemuese: "Obst & Gemüse",
  fleisch_fisch: "Fleisch & Fisch",
  milchprodukte: "Milchprodukte & Eier",
  trockenware: "Trockenware & Getreide",
  gewuerze: "Gewürze & Kräuter",
  oele_essig: "Öle & Essig",
  tiefkuehl: "Tiefkühl",
  sonstiges: "Sonstiges",
};

const AISLE_KEYWORDS: Record<Aisle, string[]> = {
  obst_gemuese: [
    "zwiebel",
    "knoblauch",
    "tomate",
    "gurke",
    "zitrone",
    "spinat",
    "petersilie",
    "koriander",
    "minze",
    "zucchini",
    "paprika",
    "karotte",
    "möhre",
    "kohl",
    "salat",
    "kartoffel",
    "süßkartoffel",
    "apfel",
    "banane",
    "beeren",
    "avocado",
    "ingwer",
    "lauch",
    "aubergine",
    "pilz",
    "champignon",
    "rucola",
    "blumenkohl",
    "brokkoli",
    "staudensellerie",
    "fenchel",
    "rettich",
    "dill",
    "thymian",
    "basilikum",
  ],
  fleisch_fisch: [
    "hähnchen",
    "huhn",
    "rind",
    "hack",
    "pute",
    "lamm",
    "lachs",
    "thunfisch",
    "thun",
    "sardine",
    "kabeljau",
    "garnele",
    "fisch",
    "schinken",
    "wurst",
    "speck",
  ],
  milchprodukte: [
    "joghurt",
    "quark",
    "feta",
    "käse",
    "mozzarella",
    "parmesan",
    "halloumi",
    "milch",
    "sahne",
    "schmand",
    "frischkäse",
    "butter",
    "ei ",
    "eier",
    "hüttenkäse",
  ],
  trockenware: [
    "reis",
    "bulgur",
    "linsen",
    "kichererbsen",
    "bohnen",
    "haferflocken",
    "nudeln",
    "pasta",
    "orzo",
    "couscous",
    "quinoa",
    "mehl",
    "brot",
    "pita",
    "tortilla",
    "kerne",
    "nüsse",
    "mandel",
    "walnuss",
    "rosinen",
    "dattel",
    "tomatenmark",
    "tomaten",
    "oliven",
    "kapern",
    "brühe",
  ],
  gewuerze: [
    "salz",
    "pfeffer",
    "kreuzkümmel",
    "paprika edelsüß",
    "zimt",
    "oregano",
    "thymian",
    "rosmarin",
    "kurkuma",
    "curry",
    "chili",
    "lorbeer",
    "muskat",
    "zatar",
    "sumach",
    "bouillon",
    "honig",
    "senf",
  ],
  oele_essig: ["olivenöl", "öl", "essig", "sesamöl", "rapsöl", "sojasauce"],
  tiefkuehl: ["tiefkühl", "tk "],
  sonstiges: [],
};

const LIQUID_KEYWORDS = [
  "öl",
  "oel",
  "essig",
  "saft",
  "milch",
  "sahne",
  "wasser",
  "brühe",
  "sauce",
  "soße",
  "sirup",
  "honig",
  "sojasauce",
];

function isLiquid(name: string): boolean {
  const lc = name.toLowerCase();
  return LIQUID_KEYWORDS.some((kw) => lc.includes(kw));
}

/**
 * Normalized metric conversion for a recipe ingredient.
 *
 * Returns { qty, unit } in "g" or "ml" when the source unit has a stable
 * conversion; otherwise returns the original qty/unit unchanged (e.g.
 * "Stück", "Packung", "mittel" — you buy those by count or package at the store).
 */
function toMetric(
  name: string,
  qty: number | null | undefined,
  unit: string | null | undefined,
): { qty: number | null; unit: string | null } {
  const q = qty == null || !Number.isFinite(qty) ? null : qty;
  const u = (unit ?? "").trim();
  if (q == null || !u) return { qty: q, unit: u || null };

  const uLc = u.toLowerCase();
  const liquid = isLiquid(name);

  // Already metric.
  if (uLc === "g" || uLc === "gramm") return { qty: q, unit: "g" };
  if (uLc === "kg") return { qty: q * 1000, unit: "g" };
  if (uLc === "ml") return { qty: q, unit: "ml" };
  if (uLc === "l" || uLc === "liter") return { qty: q * 1000, unit: "ml" };

  // Volumetric/bulk units.
  if (uLc === "el") return { qty: q * 15, unit: liquid ? "ml" : "g" };
  if (uLc === "tl") return { qty: q * 5, unit: liquid ? "ml" : "g" };
  if (uLc === "tasse" || uLc === "tassen")
    return { qty: q * 200, unit: liquid ? "ml" : "g" };
  if (uLc === "becher") return { qty: q * 500, unit: "g" }; // Joghurt/Quark-Standard
  if (uLc === "handvoll" || uLc === "handvoll") return { qty: q * 30, unit: "g" };
  if (uLc === "schale" || uLc === "schalen") return { qty: q * 250, unit: "g" };
  if (uLc === "glas" || uLc === "gläser") return { qty: q * 150, unit: "g" };
  if (uLc === "prise" || uLc === "prisen") return { qty: q, unit: "Prise" };
  if (uLc === "bund") return { qty: q, unit: "Bund" };
  if (uLc === "zehen" || uLc === "zehe") return { qty: q, unit: "Zehen" };

  // Anything we can't convert (Stück, mittel, Packung, faustgroß, etc.) stays.
  return { qty: q, unit: u };
}

export function classifyAisle(name: string): Aisle {
  const lc = name.toLowerCase();
  const entries = Object.entries(AISLE_KEYWORDS) as [Aisle, string[]][];
  for (const [aisle, kws] of entries) {
    for (const kw of kws) {
      if (lc.includes(kw)) return aisle;
    }
  }
  return "sonstiges";
}

export type ShoppingItem = {
  itemKey: string;
  name: string;
  qty: number | null;
  unit: string | null;
  aisle: Aisle;
  fromRecipes: string[];
};

/**
 * Normalize name for consolidation: lowercase, drop parenthetical notes,
 * drop trailing punctuation, collapse whitespace.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[,.;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getCurrentPlanWithIngredients() {
  return db.mealPlan.findUnique({
    where: { weekStart: weekStart() },
    include: {
      meals: { include: { recipe: true } },
      shoppingState: true,
    },
  });
}

type PlanWithMeals = NonNullable<
  Awaited<ReturnType<typeof getCurrentPlanWithIngredients>>
>;

export function buildShoppingList(plan: PlanWithMeals): ShoppingItem[] {
  // Count how many portions of each recipe the plan needs.
  const neededPortionsByRecipe = new Map<number, number>();
  for (const m of plan.meals) {
    neededPortionsByRecipe.set(
      m.recipeId,
      (neededPortionsByRecipe.get(m.recipeId) ?? 0) + m.portionsFromBatch,
    );
  }

  const acc = new Map<string, ShoppingItem>();

  // Unique recipes in the plan.
  const uniqueRecipes = new Map<number, (typeof plan.meals)[number]["recipe"]>();
  for (const m of plan.meals) uniqueRecipes.set(m.recipeId, m.recipe);

  for (const recipe of uniqueRecipes.values()) {
    const needed = neededPortionsByRecipe.get(recipe.id) ?? 0;
    const batches = Math.ceil(needed / Math.max(1, recipe.portions));
    const ingredients = (recipe.ingredients as unknown as Ingredient[]) ?? [];
    for (const ing of ingredients) {
      const metric = toMetric(ing.name, ing.qty, ing.unit);
      const scaledQty =
        metric.qty != null ? metric.qty * batches : null;
      const norm = normalize(ing.name);
      const unitKey = (metric.unit ?? "").trim();
      const key = `${norm}__${unitKey}`;
      const existing = acc.get(key);
      if (existing) {
        if (scaledQty != null) {
          existing.qty = (existing.qty ?? 0) + scaledQty;
        }
        if (!existing.fromRecipes.includes(recipe.title)) {
          existing.fromRecipes.push(recipe.title);
        }
      } else {
        acc.set(key, {
          itemKey: key,
          name: ing.name,
          qty: scaledQty,
          unit: metric.unit,
          aisle: classifyAisle(ing.name),
          fromRecipes: [recipe.title],
        });
      }
    }
  }

  return Array.from(acc.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de"),
  );
}

export function groupByAisle(
  items: ShoppingItem[],
): { aisle: Aisle; items: ShoppingItem[] }[] {
  const order: Aisle[] = [
    "obst_gemuese",
    "fleisch_fisch",
    "milchprodukte",
    "trockenware",
    "gewuerze",
    "oele_essig",
    "tiefkuehl",
    "sonstiges",
  ];
  const groups: Record<Aisle, ShoppingItem[]> = {
    obst_gemuese: [],
    fleisch_fisch: [],
    milchprodukte: [],
    trockenware: [],
    gewuerze: [],
    oele_essig: [],
    tiefkuehl: [],
    sonstiges: [],
  };
  for (const it of items) groups[it.aisle].push(it);
  return order
    .filter((a) => groups[a].length > 0)
    .map((a) => ({ aisle: a, items: groups[a] }));
}

export function fmtQty(qty: number | null, unit: string | null): string {
  if (qty == null) return "";
  let display: number;
  if (unit === "g") {
    display = Math.round(qty);
  } else if (unit === "ml") {
    display = Math.round(qty / 10) * 10;
  } else {
    display = Math.round(qty * 100) / 100;
  }
  const s = Number.isInteger(display)
    ? String(display)
    : display.toLocaleString("de-DE");
  return unit ? `${s} ${unit}` : s;
}

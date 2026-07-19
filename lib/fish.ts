import { db } from "./db";

/**
 * Fisch-Rotation für die Wochenplanung: Die beiden Gruppen decken
 * unterschiedliche Nährstoffe (Omega-3 vs. Jod) und sollen sich von Woche zu
 * Woche abwechseln. Die zuletzt geplante Gruppe wird aus den vergangenen
 * Wochenplänen erkannt und der Plan-Generierung als Vorgabe mitgegeben.
 */
export type FishGroup = "omega3" | "weissfisch";

// Reihenfolge wichtig: "seelachs" muss vor dem Omega-3-Keyword "lachs"
// geprüft werden, sonst wird Seelachs falsch klassifiziert.
const WEISSFISCH_KEYWORDS = [
  "seelachs",
  "kabeljau",
  "dorsch",
  "schellfisch",
  "scholle",
  "seehecht",
  "rotbarsch",
];
const OMEGA3_KEYWORDS = [
  "sardine",
  "sardelle",
  "hering",
  "matjes",
  "makrele",
  "lachs",
  "forelle",
];

/** Ordnet ein Rezept (Titel + Zutatennamen) einer Fisch-Gruppe zu. */
export function classifyFishRecipe(text: string): FishGroup | null {
  const t = text.toLowerCase();
  if (WEISSFISCH_KEYWORDS.some((k) => t.includes(k))) return "weissfisch";
  if (OMEGA3_KEYWORDS.some((k) => t.includes(k))) return "omega3";
  return null;
}

/**
 * Fisch-Gruppen des jüngsten fischhaltigen Plans VOR der gerade geplanten
 * Woche (die evtl. schon existierende Version derselben Woche würde die
 * Rotation sonst gegen sich selbst drehen). Leeres Array = keine
 * Fisch-Historie gefunden.
 */
export async function getLastFishGroups(
  userId: number,
  beforeWeekStart: Date,
): Promise<FishGroup[]> {
  const plans = await db.mealPlan.findMany({
    where: { userId, weekStart: { lt: beforeWeekStart } },
    orderBy: { weekStart: "desc" },
    take: 3,
    include: {
      meals: {
        include: { recipe: { select: { title: true, ingredients: true } } },
      },
    },
  });

  for (const plan of plans) {
    const groups = new Set<FishGroup>();
    for (const meal of plan.meals) {
      const ingredientNames = Array.isArray(meal.recipe.ingredients)
        ? (meal.recipe.ingredients as { name?: string }[])
            .map((i) => i.name ?? "")
            .join(" ")
        : "";
      const group = classifyFishRecipe(`${meal.recipe.title} ${ingredientNames}`);
      if (group) groups.add(group);
    }
    if (groups.size) return [...groups];
  }
  return [];
}

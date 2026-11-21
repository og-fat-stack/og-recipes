import type { ImportDraft } from "../ai/importRecipe";
import { analyzeNutrition } from "../ai/analyzeNutrition";
import { logGenerationFailure } from "../generationLog";
import { NUTRITION_PROMPT_VERSION } from "../ai/promptVersions";
import { extractRecipeFromHtml, type ExtractedRecipe } from "./extract";
import { fetchRecipePage } from "./fetchPage";
import { parseIngredientLine, parseYield } from "./parseIngredient";

/**
 * Von Link zu Rezept-Kandidat: Seite laden → schema.org-Rezept auslesen →
 * Makros mit dem BLS nachrechnen. Gemeinsam genutzt von Rezeptsuche und
 * Wochenplan.
 */

export type FetchedRecipe = { url: string; recipe: ExtractedRecipe };
export type Candidate = { url: string; draft: ImportDraft };

/** Kleine Parallelitäts-Bremse, damit nicht Dutzende Requests gleichzeitig laufen. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Lädt die Seiten und behält nur die, die ein maschinenlesbares Rezept haben. */
export async function fetchRecipes(urls: string[]): Promise<FetchedRecipe[]> {
  const results = await mapLimit([...new Set(urls)], 6, async (url) => {
    try {
      const page = await fetchRecipePage(url);
      const recipe = extractRecipeFromHtml(page.html);
      return recipe ? { url: page.url, recipe } : null;
    } catch {
      return null; // blockiert, 404, kein Rezept → einfach überspringen
    }
  });
  // Gleiche Seite über verschiedene Links (Weiterleitungen) nur einmal.
  const seen = new Set<string>();
  return results.filter((r): r is FetchedRecipe => {
    if (!r || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Macht aus geladenen Rezepten Plan-Kandidaten — WÖRTLICH, ohne Claude:
 * Zutatenzeilen werden zerlegt ("500 g Spitzkohl" → 500 / g / Spitzkohl),
 * Schritte bleiben die des Originals. Nur die Nährwerte rechnet die
 * BLS-Analyse aus. Rezepte ohne verlässliche BLS-Rechnung fallen heraus.
 */
export async function toPlanCandidates(
  userId: number,
  items: (FetchedRecipe & { mealType: "breakfast" | "main" })[],
): Promise<Candidate[]> {
  const usable = items.filter((f) => f.recipe.instructions.length > 0);
  const base = usable.map((f) => ({
    title: f.recipe.name.replace(/\s+Rezept$/i, "").slice(0, 120),
    cuisine: (f.recipe.cuisine ?? f.recipe.category ?? "Sonstige").split(",")[0].trim().slice(0, 60) || "Sonstige",
    mealType: f.mealType,
    portions: parseYield(f.recipe.yield),
    // Haltbarkeit steht auf keiner Seite — vorsichtig: Reste bis zum Folgetag.
    batchStorageDays: 2,
    ingredients: f.recipe.ingredients.map(parseIngredientLine),
    steps: f.recipe.instructions,
    techniques: [] as string[],
  }));
  if (base.length === 0) return [];

  // Pro Rezept parallel statt alle in einem großen Aufruf: die Wartezeit ist
  // dann die des langsamsten Rezepts, nicht die Summe.
  const results = await mapLimit(base, 10, async (b) => {
    try {
      return (await analyzeNutrition([b]))[0];
    } catch (e) {
      await logGenerationFailure(userId, "nutrition", e, NUTRITION_PROMPT_VERSION);
      return null;
    }
  });
  const out: Candidate[] = [];
  base.forEach((b, i) => {
    const r = results[i];
    if (!r || b.title.length < 2 || b.ingredients.length < 2) return;
    out.push({
      url: usable[i].url,
      draft: {
        ...b,
        kcalPerPortion: Math.min(3000, r.perPortion.kcal),
        proteinG: Math.min(300, r.perPortion.protein),
        carbG: Math.min(500, r.perPortion.carb),
        fatG: Math.min(300, r.perPortion.fat),
        ingredients: r.ingredients,
        macroSource: NUTRITION_PROMPT_VERSION,
        macroCoverage: Math.round(r.coverage * 100),
        violations: [],
      },
    });
  });
  return out;
}

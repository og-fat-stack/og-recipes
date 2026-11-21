"use server";

import { requireUserId } from "../../../lib/auth";
import { getProfile } from "../../../lib/profile";
import { getClaudeMemoryText } from "../../../lib/claudeMemory";
import { getRecipes } from "../../../lib/recipe";
import { logGenerationFailure } from "../../../lib/generationLog";
import { FIND_PROMPT_VERSION } from "../../../lib/ai/promptVersions";
import { findRecipeUrls } from "../../../lib/ai/findRecipes";
import { fetchRecipes } from "../../../lib/recipeImport/candidates";
import { perMealTarget } from "../../../lib/planner";

export type FoundRecipe = {
  url: string;
  site: string;
  title: string;
  yield?: string;
  totalTime?: string;
  ingredients: string[];
  /** Nährwertangaben der Seite (nicht nachgerechnet). */
  kcal?: string;
  protein?: string;
};

export type SearchState =
  | { status: "idle" }
  | { status: "ok"; wish: string; mealType: string; results: FoundRecipe[] }
  | { status: "error"; wish: string; mealType: string; error: string };

const MAX_RESULTS = 6;

/** ISO-8601-Dauer ("PT1H15M") → "1 Std. 15 Min." */
function duration(iso?: string): string | undefined {
  const m = iso?.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m || (!m[1] && !m[2])) return undefined;
  return [m[1] && `${m[1]} Std.`, m[2] && `${m[2]} Min.`].filter(Boolean).join(" ");
}

/** Manche Seiten liefern nur Zahlen ("772") — dann die Einheit ergänzen. */
function withUnit(v: string | undefined, unit: string): string | undefined {
  if (!v) return undefined;
  return /^\s*[\d.,]+\s*$/.test(v) ? `${v.trim()} ${unit}` : v;
}

export async function searchRecipes(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const wish = String(formData.get("wish") ?? "").trim();
  const mealType = formData.get("mealType") === "breakfast" ? "breakfast" : "main";
  const fail = (error: string): SearchState => ({ status: "error", wish, mealType, error });
  if (wish.length < 3) return fail("Bitte beschreibe, was du suchst.");

  const userId = await requireUserId();
  try {
    const [profile, claudeMemory, own] = await Promise.all([
      getProfile(userId),
      getClaudeMemoryText(userId),
      getRecipes(userId),
    ]);
    const urls = await findRecipeUrls({
      requests: [{ id: "suche", mealType, wish, count: MAX_RESULTS }],
      vegetarian: profile?.vegetarian ?? false,
      claudeMemory,
      budgetConscious: profile?.budgetConscious ?? true,
      perMeal: profile ? perMealTarget(profile) : { kcal: 550, protein: 35 },
      avoidTitles: own.map((r) => r.title),
    });
    const fetched = await fetchRecipes([...urls.values()].flat());
    if (fetched.length === 0) {
      return fail("Keine abrufbaren Rezepte gefunden — formuliere die Suche etwas anders.");
    }
    const results = fetched.slice(0, MAX_RESULTS).map(({ url, recipe }) => ({
      url,
      site: new URL(url).hostname.replace(/^www\./, ""),
      title: recipe.name,
      yield: recipe.yield,
      totalTime: duration(recipe.totalTime),
      ingredients: recipe.ingredients.slice(0, 14),
      kcal: withUnit(recipe.nutrition?.calories, "kcal"),
      protein: withUnit(recipe.nutrition?.proteinContent, "g"),
    }));
    return { status: "ok", wish, mealType, results };
  } catch (e) {
    await logGenerationFailure(userId, "recipe", e, FIND_PROMPT_VERSION);
    return fail(e instanceof Error ? e.message : "Unbekannter Fehler");
  }
}

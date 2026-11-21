import { analyzeNutrition } from "./ai/analyzeNutrition";
import { NUTRITION_PROMPT_VERSION } from "./ai/promptVersions";
import { logGenerationFailure } from "./generationLog";
import type { Ingredient } from "./recipe";

export type MacroRecipe = {
  title: string;
  portions: number;
  ingredients: Ingredient[];
  kcalPerPortion: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  macroSource?: string;
  macroCoverage?: number;
};

const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));

/**
 * Ersetzt die Makros der Rezepte durch die BLS-Nachrechnung
 * (lib/ai/analyzeNutrition.ts). Wo die Rechnung nicht trägt (zu geringer
 * BLS-Anteil, Fehler), bleiben die ursprünglichen Werte stehen und
 * macroSource ungesetzt. Wirft nie — ein Ausfall der Analyse darf weder
 * Rezept- noch Plan-Generierung scheitern lassen; Fehler landen im
 * GenerationLog.
 */
export async function applyBlsNutrition<T extends MacroRecipe>(
  userId: number,
  recipes: T[],
): Promise<T[]> {
  if (recipes.length === 0) return recipes;
  try {
    const results = await analyzeNutrition(recipes);
    return recipes.map((r, i) => {
      const res = results[i];
      if (!res) return r;
      return {
        ...r,
        kcalPerPortion: clamp(res.perPortion.kcal, 3000),
        proteinG: clamp(res.perPortion.protein, 300),
        carbG: clamp(res.perPortion.carb, 500),
        fatG: clamp(res.perPortion.fat, 300),
        ingredients: res.ingredients,
        macroSource: NUTRITION_PROMPT_VERSION,
        macroCoverage: Math.round(res.coverage * 100),
      };
    });
  } catch (e) {
    await logGenerationFailure(userId, "nutrition", e, NUTRITION_PROMPT_VERSION);
    return recipes;
  }
}

/**
 * Prompt-Versionen. REGEL: Bei jeder inhaltlichen Änderung am jeweiligen
 * System-Prompt die Nummer hier hochzählen — sie wird an jedem Rezept
 * (Recipe.promptVersion bzw. Recipe.macroSource), Food-Log-Eintrag und
 * Fehler-Log mitgespeichert. So wird aus "ich glaube, der neue Prompt ist
 * besser" eine messbare Like-Quote pro Version (scripts/promptStats.ts).
 *
 * Claude erfindet keine Rezepte mehr (bis "recipe-3" / "plan-5" tat es das):
 * Rezepte kommen per Link-Import oder Web-Suche von echten Rezeptseiten.
 */
/** lib/ai/selectPlan.ts — Auswahl der Rezepte für den Wochenplan. */
export const PLAN_PROMPT_VERSION = "plan-6";
/** lib/ai/estimateFood.ts */
export const FOOD_PROMPT_VERSION = "food-1";
/** lib/ai/importRecipe.ts — Übertragung eines bestehenden Rezepts ins App-Format. */
export const IMPORT_PROMPT_VERSION = "import-2";
/** lib/ai/findRecipes.ts — Web-Suche; an so gefundenen Rezepten gespeichert. */
export const FIND_PROMPT_VERSION = "find-1";
/** lib/ai/analyzeNutrition.ts — wird als Recipe.macroSource gespeichert. */
export const NUTRITION_PROMPT_VERSION = "bls-1";

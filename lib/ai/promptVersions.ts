/**
 * Prompt-Versionen der Generatoren. REGEL: Bei jeder inhaltlichen Änderung
 * am jeweiligen System-Prompt (lib/ai/generateRecipe.ts, lib/ai/generatePlan.ts
 * bzw. lib/ai/estimateFood.ts) die Nummer hier hochzählen — sie wird an jedem
 * generierten Rezept (Recipe.promptVersion), Food-Log-Eintrag und Fehler-Log
 * mitgespeichert. So wird aus "ich glaube, der neue Prompt ist besser" eine
 * messbare Like-Quote pro Version (scripts/promptStats.ts).
 */
export const RECIPE_PROMPT_VERSION = "recipe-2";
export const PLAN_PROMPT_VERSION = "plan-3";
export const FOOD_PROMPT_VERSION = "food-1";

/**
 * Prompt-Versionen der beiden Generatoren. REGEL: Bei jeder inhaltlichen
 * Änderung am jeweiligen System-Prompt (lib/ai/generateRecipe.ts bzw.
 * lib/ai/generatePlan.ts) die Nummer hier hochzählen — sie wird an jedem
 * generierten Rezept (Recipe.promptVersion) und Fehler-Log mitgespeichert.
 * So wird aus "ich glaube, der neue Prompt ist besser" eine messbare
 * Like-Quote pro Version (scripts/promptStats.ts).
 */
export const RECIPE_PROMPT_VERSION = "recipe-1";
export const PLAN_PROMPT_VERSION = "plan-2";

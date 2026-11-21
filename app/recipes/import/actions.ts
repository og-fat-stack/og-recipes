"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUserId } from "../../../lib/auth";
import { getProfile } from "../../../lib/profile";
import { getClaudeMemoryText } from "../../../lib/claudeMemory";
import { IMPORT_PROMPT_VERSION } from "../../../lib/ai/promptVersions";
import { logGenerationFailure } from "../../../lib/generationLog";
import { applyBlsNutrition } from "../../../lib/nutrition";
import { RecipeDraftSchema } from "../../../lib/ai/recipeDraft";
import { importRecipeDraft, type ImportDraft } from "../../../lib/ai/importRecipe";
import {
  extractRecipeFromHtml,
  type ExtractedRecipe,
} from "../../../lib/recipeImport/extract";
import {
  fetchRecipePage,
  ImportFetchError,
  parseImportUrl,
} from "../../../lib/recipeImport/fetchPage";

export type ImportState =
  | { status: "idle" }
  | { status: "ok"; draft: ImportDraft; url: string }
  | { status: "error"; error: string; url: string; text: string };

/** Gültiger http(s)-Link oder "" — für die optionale Quellenangabe. */
function safeSourceUrl(raw: string): string {
  try {
    return raw ? parseImportUrl(raw).toString() : "";
  } catch {
    return "";
  }
}

/**
 * Lädt ein Rezept von einer URL und überträgt es (unverändert) ins
 * App-Format inkl. BLS-Makros — gemeinsam für Link-Import und Rezeptsuche.
 */
async function importFromUrl(userId: number, url: string, text = ""): Promise<ImportState> {
  const fail = (error: string): ImportState => ({ status: "error", error, url, text });
  let page: { html: string; url: string };
  try {
    page = await fetchRecipePage(url);
  } catch (e) {
    const msg =
      e instanceof ImportFetchError ? e.message : "Die Seite konnte nicht geladen werden.";
    return fail(`${msg} Kopiere stattdessen den Rezepttext von der Seite und füge ihn unten ein.`);
  }
  const extracted = extractRecipeFromHtml(page.html);
  if (!extracted) {
    return fail(
      "Auf dieser Seite wurde kein maschinenlesbares Rezept gefunden. Kopiere stattdessen den Rezepttext von der Seite und füge ihn unten ein.",
    );
  }
  return convert(userId, extracted, page.url, fail);
}

async function convert(
  userId: number,
  source: ExtractedRecipe | string,
  sourceUrl: string,
  fail: (error: string) => ImportState,
): Promise<ImportState> {
  try {
    const [profile, claudeMemory] = await Promise.all([
      getProfile(userId),
      getClaudeMemoryText(userId),
    ]);
    const claudeDraft = await importRecipeDraft({ recipe: source, profile, claudeMemory });
    const [draft] = await applyBlsNutrition(userId, [claudeDraft]);
    return { status: "ok", draft, url: sourceUrl };
  } catch (e) {
    await logGenerationFailure(userId, "import", e, IMPORT_PROMPT_VERSION);
    return fail(e instanceof Error ? e.message : "Unbekannter Fehler");
  }
}

/** Für die Rezeptsuche: ein gefundenes Rezept zur Vorschau übertragen. */
export async function prepareFoundRecipe(url: string): Promise<ImportState> {
  const userId = await requireUserId();
  return importFromUrl(userId, safeSourceUrl(url) || url);
}

export async function importRecipe(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const url = String(formData.get("url") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const fail = (error: string): ImportState => ({ status: "error", error, url, text });
  if (!url && !text) return fail("Bitte füge einen Link oder den Rezepttext ein.");
  const userId = await requireUserId();

  // Eingefügter Text hat Vorrang: der Ausweg für Seiten, die den
  // automatischen Abruf blockieren (z. B. Chefkoch).
  if (text) {
    if (text.length < 40) return fail("Der eingefügte Text ist zu kurz für ein Rezept.");
    return convert(userId, text, safeSourceUrl(url), fail);
  }
  return importFromUrl(userId, url);
}

export async function saveImportedRecipe(
  draftJson: string,
  sourceUrl: string,
): Promise<void> {
  const userId = await requireUserId();
  const draft = RecipeDraftSchema.parse(JSON.parse(draftJson));
  // Nur http(s) — der Link wird später als href gerendert.
  const source = safeSourceUrl(sourceUrl) || null;
  const recipe = await db.recipe.create({
    data: {
      userId,
      title: draft.title,
      cuisine: draft.cuisine,
      mealType: draft.mealType,
      portions: draft.portions,
      kcalPerPortion: draft.kcalPerPortion,
      proteinG: draft.proteinG,
      carbG: draft.carbG,
      fatG: draft.fatG,
      batchStorageDays: draft.batchStorageDays,
      ingredients: draft.ingredients,
      steps: draft.steps,
      techniques: draft.techniques,
      sourceUrl: source,
      macroSource: draft.macroSource ?? null,
      macroCoverage: draft.macroCoverage ?? null,
      promptVersion: IMPORT_PROMPT_VERSION,
    },
  });
  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUserId } from "../../../lib/auth";
import { getProfile } from "../../../lib/profile";
import { getClaudeMemoryText } from "../../../lib/claudeMemory";
import { logGenerationFailure } from "../../../lib/generationLog";
import {
  generateRecipeDraft,
  type RecipeDraft,
} from "../../../lib/ai/generateRecipe";

export type GenerateState =
  | { status: "idle" }
  | { status: "ok"; draft: RecipeDraft; prompt: string }
  | { status: "error"; error: string; prompt: string };

export async function generateRecipe(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (prompt.length < 4) {
    return {
      status: "error",
      error: "Bitte beschreibe, was du kochen möchtest.",
      prompt,
    };
  }
  const userId = await requireUserId();
  try {
    const [profile, claudeMemory] = await Promise.all([
      getProfile(userId),
      getClaudeMemoryText(userId),
    ]);
    const draft = await generateRecipeDraft({ prompt, profile, claudeMemory });
    return { status: "ok", draft, prompt };
  } catch (e) {
    // Roh-Antwort + Fehler festhalten — sonst wäre das Diagnose-Material
    // (was Claude tatsächlich geantwortet hat) mit diesem Request verloren.
    await logGenerationFailure(userId, "recipe", e);
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unbekannter Fehler",
      prompt,
    };
  }
}

export async function saveGeneratedRecipe(
  draftJson: string,
): Promise<void> {
  const userId = await requireUserId();
  const draft = JSON.parse(draftJson);
  const recipe = await db.recipe.create({
    data: {
      userId,
      title: draft.title,
      cuisine: draft.cuisine,
      portions: draft.portions,
      kcalPerPortion: draft.kcalPerPortion,
      proteinG: draft.proteinG,
      carbG: draft.carbG,
      fatG: draft.fatG,
      batchStorageDays: draft.batchStorageDays,
      ingredients: draft.ingredients,
      steps: draft.steps,
      techniques: draft.techniques,
      notes: draft.notes ?? null,
    },
  });
  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getProfile } from "../../../lib/profile";
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
  try {
    const profile = await getProfile();
    const draft = await generateRecipeDraft({ prompt, profile });
    return { status: "ok", draft, prompt };
  } catch (e) {
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
  const draft = JSON.parse(draftJson);
  const recipe = await db.recipe.create({
    data: {
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

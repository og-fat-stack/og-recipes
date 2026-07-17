"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { parseIngredients, parseLines, parseTags } from "../../lib/recipe";

const RecipeSchema = z.object({
  title: z.string().min(2).max(120),
  cuisine: z.string().min(2).max(60),
  portions: z.coerce.number().int().min(1).max(30),
  kcalPerPortion: z.coerce.number().int().min(50).max(3000),
  proteinG: z.coerce.number().int().min(0).max(300),
  carbG: z.coerce.number().int().min(0).max(500),
  fatG: z.coerce.number().int().min(0).max(300),
  batchStorageDays: z.coerce.number().int().min(1).max(14),
  ingredients: z.string().min(1),
  steps: z.string().min(1),
  techniques: z.string().optional().default(""),
  notes: z.string().max(2000).optional().default(""),
});

export type SaveRecipeState = { error?: string };

export async function createRecipe(
  _prev: SaveRecipeState,
  formData: FormData,
): Promise<SaveRecipeState> {
  const parsed = RecipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const userId = await requireUserId();
  const d = parsed.data;
  const recipe = await db.recipe.create({
    data: {
      userId,
      title: d.title,
      cuisine: d.cuisine,
      portions: d.portions,
      kcalPerPortion: d.kcalPerPortion,
      proteinG: d.proteinG,
      carbG: d.carbG,
      fatG: d.fatG,
      batchStorageDays: d.batchStorageDays,
      ingredients: parseIngredients(d.ingredients),
      steps: parseLines(d.steps),
      techniques: parseTags(d.techniques),
      notes: d.notes || null,
    },
  });
  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function deleteRecipe(id: number): Promise<void> {
  const userId = await requireUserId();
  await db.recipe.deleteMany({ where: { id, userId } });
  revalidatePath("/recipes");
  revalidatePath("/plan");
  revalidatePath("/");
}

export type FeedbackState = { ok?: boolean; error?: string };

/** Persönliche Notiz nach dem Kochen ("zu fad", "Familie fand's super", ...). */
export async function saveRecipeFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const userId = await requireUserId();
  const id = Number(formData.get("recipeId"));
  if (!Number.isInteger(id)) return { error: "Ungültiges Rezept." };
  const note = String(formData.get("feedbackNote") ?? "").trim();
  if (note.length > 2000) {
    return { error: "Notiz ist zu lang (max. 2000 Zeichen)." };
  }
  const updated = await db.recipe.updateMany({
    where: { id, userId },
    data: { feedbackNote: note || null },
  });
  if (updated.count === 0) return { error: "Rezept nicht gefunden." };
  revalidatePath(`/recipes/${id}`);
  return { ok: true };
}

/** liked = true (like) | false (dislike) | null (zurücksetzen). */
export async function setRecipeLiked(
  id: number,
  liked: boolean | null,
): Promise<void> {
  const userId = await requireUserId();
  await db.recipe.updateMany({ where: { id, userId }, data: { liked } });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}

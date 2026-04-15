"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../../lib/db";
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
  const d = parsed.data;
  const recipe = await db.recipe.create({
    data: {
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
  await db.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
  revalidatePath("/plan");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { planCookSessions } from "../../lib/cookPlan";
import type { Ingredient } from "../../lib/recipe";

export async function startCookSession(recipeId: number): Promise<void> {
  const userId = await requireUserId();
  const recipe = await db.recipe.findFirst({
    where: { id: recipeId, userId },
  });
  if (!recipe) throw new Error("Rezept nicht gefunden.");

  // Große Schmor-/Bratgerichte (> 3 Hähnchenschenkel) passen nicht in einen
  // Topf/eine Pfanne und werden deterministisch auf mehrere Kochsessions an
  // aufeinanderfolgenden Tagen aufgeteilt (eine Runde ≤ 3 Schenkel pro Tag).
  const plan = planCookSessions({
    portions: recipe.portions,
    ingredients: (recipe.ingredients as unknown as Ingredient[]) ?? [],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const entry of plan) {
    const date = new Date(today);
    date.setDate(date.getDate() + entry.dayOffset);
    await db.cookSession.create({
      data: {
        userId,
        recipeId,
        date,
        portionsMade: entry.portionsMade,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/recipes/${recipeId}`);
}

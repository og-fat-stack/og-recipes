"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { getProfile } from "../../lib/profile";
import {
  getRecentMealTitles,
  pickKnownMainMealRecipes,
  weekStart,
} from "../../lib/plan";
import { generatePlanDraft } from "../../lib/ai/generatePlan";

export type GeneratePlanState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: string };

export async function generateWeeklyPlan(
  _prev: GeneratePlanState,
  _formData: FormData,
): Promise<GeneratePlanState> {
  const profile = await getProfile();
  if (!profile) {
    return { status: "error", error: "Zuerst das Profil ausfüllen." };
  }
  try {
    const [recentTitles, knownMainPool] = await Promise.all([
      getRecentMealTitles(14),
      pickKnownMainMealRecipes(2),
    ]);

    const knownSummaries = knownMainPool.map((r) => ({
      title: r.title,
      cuisine: r.cuisine,
      portions: r.portions,
      kcalPerPortion: r.kcalPerPortion,
      proteinG: r.proteinG,
      carbG: r.carbG,
      fatG: r.fatG,
      batchStorageDays: r.batchStorageDays,
    }));

    const draft = await generatePlanDraft({
      profile,
      recentMealTitles: recentTitles,
      knownMainRecipes: knownSummaries,
    });

    const ws = weekStart();
    await db.mealPlan.deleteMany({ where: { weekStart: ws } });

    // Create the new recipes, collect ids. The full index space is
    // [knownMainPool ids..., newly created ids...] matching Claude's indexing.
    const newRecipeIds: number[] = [];
    for (const r of draft.newRecipes) {
      const created = await db.recipe.create({
        data: {
          title: r.title,
          cuisine: r.cuisine,
          portions: r.portions,
          kcalPerPortion: r.kcalPerPortion,
          proteinG: r.proteinG,
          carbG: r.carbG,
          fatG: r.fatG,
          batchStorageDays: r.batchStorageDays,
          ingredients: r.ingredients,
          steps: r.steps,
          techniques: r.techniques,
          notes: r.notes ?? null,
        },
      });
      newRecipeIds.push(created.id);
    }

    const allIds = [...knownMainPool.map((r) => r.id), ...newRecipeIds];

    await db.mealPlan.create({
      data: {
        weekStart: ws,
        notes: draft.weekNotes ?? null,
        meals: {
          create: draft.assignments.map((a) => ({
            day: a.day,
            slot: a.slot,
            recipeId: allIds[a.recipeIndex],
          })),
        },
      },
    });

    revalidatePath("/plan");
    revalidatePath("/");
    revalidatePath("/recipes");
    return { status: "ok" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unbekannter Fehler",
    };
  }
}

export async function deleteCurrentPlan(): Promise<void> {
  const ws = weekStart();
  await db.mealPlan.deleteMany({ where: { weekStart: ws } });
  revalidatePath("/plan");
  revalidatePath("/");
}

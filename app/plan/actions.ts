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
import { getReflectionDigests } from "../../lib/reflection";
import { getClaudeMemoryText } from "../../lib/claudeMemory";

export type GeneratePlanState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: string };

function parseDay(v: FormDataEntryValue | null, fallback: number): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback;
}

export async function generateWeeklyPlan(
  _prev: GeneratePlanState,
  formData: FormData,
): Promise<GeneratePlanState> {
  const profile = await getProfile();
  if (!profile) {
    return { status: "error", error: "Zuerst das Profil ausfüllen." };
  }

  const startDay = parseDay(formData.get("startDay"), 0);
  let endDay = parseDay(formData.get("endDay"), 6);
  if (endDay < startDay) endDay = startDay;
  const useUpIngredients = (formData.get("useUpIngredients") ?? "")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const [recentTitles, knownMainPool, reflectionDigests, claudeMemory] =
      await Promise.all([
        getRecentMealTitles(14),
        pickKnownMainMealRecipes(2),
        getReflectionDigests(6),
        getClaudeMemoryText(),
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
      reflectionDigests: reflectionDigests.map((r) => ({
        recipeTitle: r.recipeTitle,
        rating: r.rating,
        summary: r.summary,
        nextTimeTry: r.nextTimeTry,
      })),
      dayRange: { start: startDay, end: endDay },
      useUpIngredients,
      claudeMemory,
    });

    const ws = weekStart();
    await db.mealPlan.deleteMany({ where: { weekStart: ws } });

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
    revalidatePath("/plan/shopping");
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
  revalidatePath("/plan/shopping");
  revalidatePath("/");
}

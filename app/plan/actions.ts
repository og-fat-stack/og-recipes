"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import {
  getRecentMealTitles,
  parseWeekSel,
  pickKnownMainMealRecipes,
  weekStart,
  weekStartFor,
} from "../../lib/plan";
import { berlinWeekdayIndex } from "../../lib/time";
import { generatePlanDraft } from "../../lib/ai/generatePlan";
import { getClaudeMemoryText } from "../../lib/claudeMemory";

export type GeneratePlanState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: string };

function parseDay(v: FormDataEntryValue | null, fallback: number): number {
  // Fehlt das Feld (Optionen eingeklappt), ist v null/"" — dann den Fallback nehmen.
  // Wichtig: Number(null) und Number("") sind 0, würden also fälschlich als gültiger
  // Tag 0 (Montag) durchgehen und den Bereich auf einen Tag zusammenschrumpfen.
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback;
}

export async function generateWeeklyPlan(
  _prev: GeneratePlanState,
  formData: FormData,
): Promise<GeneratePlanState> {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (!profile) {
    return { status: "error", error: "Zuerst das Profil ausfüllen." };
  }

  const week = parseWeekSel(formData.get("week")?.toString());
  const ws = weekStartFor(week);

  // Für vergangene Tage wird nie geplant: in der laufenden Woche frühestens ab
  // heute, in der kommenden Woche liegt ohnehin alles in der Zukunft.
  const minDay = week === "this" ? berlinWeekdayIndex() : 0;
  const startDay = Math.max(parseDay(formData.get("startDay"), minDay), minDay);
  let endDay = parseDay(formData.get("endDay"), 6);
  if (endDay < startDay) endDay = startDay;
  const useUpIngredients = (formData.get("useUpIngredients") ?? "")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const [recentTitles, knownMainPool, claudeMemory] = await Promise.all([
      getRecentMealTitles(userId, 14),
      pickKnownMainMealRecipes(userId, 2),
      getClaudeMemoryText(userId),
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
      dayRange: { start: startDay, end: endDay },
      useUpIngredients,
      claudeMemory,
    });

    await db.mealPlan.deleteMany({ where: { userId, weekStart: ws } });

    const newRecipeIds: number[] = [];
    for (const r of draft.newRecipes) {
      const created = await db.recipe.create({
        data: {
          userId,
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

    // Sicherheitsnetz: nie etwas außerhalb des erlaubten Bereichs anlegen —
    // insbesondere keine vergangenen Tage der laufenden Woche.
    const assignments = draft.assignments.filter(
      (a) => a.day >= startDay && a.day <= endDay,
    );

    await db.mealPlan.create({
      data: {
        userId,
        weekStart: ws,
        notes: draft.weekNotes ?? null,
        meals: {
          create: assignments.map((a) => ({
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
  const userId = await requireUserId();
  const ws = weekStart();
  await db.mealPlan.deleteMany({ where: { userId, weekStart: ws } });
  revalidatePath("/plan");
  revalidatePath("/plan/shopping");
  revalidatePath("/");
}

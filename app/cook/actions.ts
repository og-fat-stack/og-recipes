"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { summarizeReflection } from "../../lib/ai/summarizeReflection";
import { planCookSessions } from "../../lib/cookPlan";
import type { Ingredient } from "../../lib/recipe";

export async function startCookSession(recipeId: number): Promise<void> {
  const recipe = await db.recipe.findUnique({ where: { id: recipeId } });
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

  let firstSessionId: number | null = null;
  for (const entry of plan) {
    const date = new Date(today);
    date.setDate(date.getDate() + entry.dayOffset);
    const session = await db.cookSession.create({
      data: {
        recipeId,
        date,
        portionsMade: entry.portionsMade,
      },
    });
    if (firstSessionId === null) firstSessionId = session.id;
  }

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/cook/reflect/${firstSessionId}`);
}

export type SaveReflectionState = { error?: string; ok?: boolean };

export async function saveReflection(
  sessionId: number,
  _prev: SaveReflectionState,
  formData: FormData,
): Promise<SaveReflectionState> {
  const wentWell = String(formData.get("wentWell") ?? "").trim();
  const wentWrong = String(formData.get("wentWrong") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 0);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Bitte 1–5 Sterne auswählen." };
  }

  const session = await db.cookSession.findUnique({
    where: { id: sessionId },
    include: { recipe: true },
  });
  if (!session) return { error: "Kochsession nicht gefunden." };

  let notes;
  try {
    notes = await summarizeReflection({
      recipeTitle: session.recipe.title,
      recipeTechniques:
        (session.recipe.techniques as unknown as string[]) ?? [],
      wentWell,
      wentWrong,
      rating,
    });
  } catch (e) {
    return {
      status: undefined,
      error:
        "Zusammenfassung fehlgeschlagen: " +
        (e instanceof Error ? e.message : "Unbekannter Fehler"),
    } as SaveReflectionState;
  }

  await db.reflection.upsert({
    where: { cookSessionId: sessionId },
    create: {
      cookSessionId: sessionId,
      wentWell: wentWell || null,
      wentWrong: wentWrong || null,
      rating,
      claudeNotes: notes,
    },
    update: {
      wentWell: wentWell || null,
      wentWrong: wentWrong || null,
      rating,
      claudeNotes: notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/cook/reflect/${sessionId}?saved=1`);
}

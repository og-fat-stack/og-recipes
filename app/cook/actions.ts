"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { summarizeReflection } from "../../lib/ai/summarizeReflection";

export async function startCookSession(recipeId: number): Promise<void> {
  const recipe = await db.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) throw new Error("Rezept nicht gefunden.");
  const session = await db.cookSession.create({
    data: {
      recipeId,
      date: new Date(),
      portionsMade: recipe.portions,
    },
  });
  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/cook/reflect/${session.id}`);
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

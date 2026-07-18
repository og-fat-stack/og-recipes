"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { estimateFood } from "../../lib/ai/estimateFood";
import { FOOD_PROMPT_VERSION } from "../../lib/ai/promptVersions";
import { logGenerationFailure } from "../../lib/generationLog";
import { parseDayParam } from "../../lib/foodLog";

const LogFoodSchema = z.object({
  text: z
    .string()
    .trim()
    .min(3, "Bitte beschreib kurz, was du gegessen hast.")
    .max(500, "Bitte kürzer fassen (max. 500 Zeichen)."),
  date: z.string().optional(),
});

export type LogFoodState = { error?: string; ok?: boolean };

export async function logFood(
  _prev: LogFoodState,
  formData: FormData,
): Promise<LogFoodState> {
  const parsed = LogFoodSchema.safeParse({
    text: formData.get("text"),
    date: formData.get("date")?.toString() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const userId = await requireUserId();
  const date = parseDayParam(parsed.data.date);

  try {
    const estimate = await estimateFood(parsed.data.text);
    await db.foodLogEntry.create({
      data: {
        userId,
        date,
        text: parsed.data.text,
        kcal: estimate.totals.kcal,
        proteinG: estimate.totals.proteinG,
        carbG: estimate.totals.carbG,
        fatG: estimate.totals.fatG,
        items: estimate.items,
        assumptions: estimate.assumptions ?? null,
        promptVersion: FOOD_PROMPT_VERSION,
      },
    });
  } catch (e) {
    await logGenerationFailure(userId, "food", e, FOOD_PROMPT_VERSION);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Die Schätzung ist fehlgeschlagen — bitte nochmal versuchen.",
    };
  }

  revalidatePath("/food");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteFoodEntry(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.foodLogEntry.deleteMany({ where: { id, userId } });
  revalidatePath("/food");
  revalidatePath("/");
}

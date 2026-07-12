"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { computeMacros } from "../../lib/macros";
import { planActivityKcalPerDay } from "../../lib/training";
import { getLatestBodyFatPct } from "../../lib/measurements";

// Kein Aktivitätslevel-Input mehr: Der trainingsfreie Alltag ist fix "sedentary",
// die eigentliche Aktivität kommt aus dem Trainingsplan (planActivityKcalPerDay).
const ACTIVITY_BASELINE = "sedentary" as const;

const ProfileSchema = z.object({
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(300),
  goalWeightKg: z.coerce.number().min(30).max(300).optional(),
  age: z.coerce.number().int().min(12).max(100),
  sex: z.enum(["male", "female"]),
  goal: z.enum(["cut", "maintain", "gain"]),
});

export type SaveProfileState = { error?: string; ok?: boolean };

export async function saveProfile(
  _prev: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const parsed = ProfileSchema.safeParse({
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    goalWeightKg: formData.get("goalWeightKg") || undefined,
    age: formData.get("age"),
    sex: formData.get("sex"),
    goal: formData.get("goal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const userId = await requireUserId();
  const bodyFatPct = await getLatestBodyFatPct(userId);
  const macros = computeMacros({
    ...parsed.data,
    activityLevel: ACTIVITY_BASELINE,
    bodyFatPct: bodyFatPct ?? undefined,
    exerciseKcalPerDay: planActivityKcalPerDay(parsed.data.weightKg),
  });

  const data = {
    ...parsed.data,
    activityLevel: ACTIVITY_BASELINE,
    kcalTarget: macros.kcalTarget,
    proteinG: macros.proteinG,
    carbG: macros.carbG,
    fatG: macros.fatG,
    waterMlTarget: macros.waterMlTarget,
    lastMacroWeightKg: parsed.data.weightKg,
    lastMacroBodyFatPct: bodyFatPct,
  };

  await db.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true };
}

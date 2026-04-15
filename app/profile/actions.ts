"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { computeMacros } from "../../lib/macros";

const ProfileSchema = z.object({
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(300),
  goalWeightKg: z.coerce.number().min(30).max(300).optional(),
  age: z.coerce.number().int().min(12).max(100),
  sex: z.enum(["male", "female"]),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
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
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const macros = computeMacros(parsed.data);

  const data = {
    ...parsed.data,
    kcalTarget: macros.kcalTarget,
    proteinG: macros.proteinG,
    carbG: macros.carbG,
    fatG: macros.fatG,
    waterMlTarget: macros.waterMlTarget,
    lastMacroWeightKg: parsed.data.weightKg,
  };

  await db.profile.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true };
}

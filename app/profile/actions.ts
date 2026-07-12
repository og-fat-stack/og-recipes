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
  thyroidReduced: z.coerce.boolean(),
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
    thyroidReduced: formData.get("thyroidReduced") != null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const userId = await requireUserId();
  const [bodyFatPct, existing] = await Promise.all([
    getLatestBodyFatPct(userId),
    db.profile.findUnique({
      where: { userId },
      select: { activityEnabled: true },
    }),
  ]);
  const activityEnabled = existing?.activityEnabled ?? true;
  const macros = computeMacros({
    ...parsed.data,
    activityLevel: ACTIVITY_BASELINE,
    bodyFatPct: bodyFatPct ?? undefined,
    exerciseKcalPerDay: activityEnabled
      ? planActivityKcalPerDay(parsed.data.weightKg)
      : 0,
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

/**
 * Schaltet um, ob Training + Schritte in die Kalorienziele einfließen, und
 * berechnet die gespeicherten Ziele sofort neu.
 */
export async function toggleActivityEnabled(): Promise<void> {
  const userId = await requireUserId();
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return;

  const activityEnabled = !profile.activityEnabled;
  const bodyFatPct = await getLatestBodyFatPct(userId);
  const macros = computeMacros({
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: bodyFatPct ?? undefined,
    age: profile.age,
    sex: profile.sex as "male" | "female",
    activityLevel: ACTIVITY_BASELINE,
    goal: profile.goal as "cut" | "maintain" | "gain",
    thyroidReduced: profile.thyroidReduced,
    exerciseKcalPerDay: activityEnabled
      ? planActivityKcalPerDay(profile.weightKg)
      : 0,
  });

  await db.profile.update({
    where: { userId },
    data: {
      activityEnabled,
      kcalTarget: macros.kcalTarget,
      proteinG: macros.proteinG,
      carbG: macros.carbG,
      fatG: macros.fatG,
      waterMlTarget: macros.waterMlTarget,
      lastMacroBodyFatPct: bodyFatPct,
    },
  });

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/weight");
}

/**
 * Schaltet um, ob Plan- und Rezeptgenerierung günstig einkaufen oder ohne
 * Budget-Einschränkung planen. Wirkt erst bei der nächsten Generierung — keine
 * gespeicherten Werte neu zu berechnen.
 */
export async function toggleBudgetConscious(): Promise<void> {
  const userId = await requireUserId();
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { budgetConscious: true },
  });
  if (!profile) return;
  await db.profile.update({
    where: { userId },
    data: { budgetConscious: !profile.budgetConscious },
  });
  revalidatePath("/profile");
  revalidatePath("/plan");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { dayKey } from "../../lib/weight";
import { computeMacros } from "../../lib/macros";
import { getLatestBodyFatPct } from "../../lib/measurements";

const LogSchema = z.object({
  kg: z.coerce.number().min(30).max(400),
  date: z.string().optional(),
  note: z.string().max(200).optional(),
});

export type LogWeightState = { error?: string; ok?: boolean };

export async function logWeight(
  _prev: LogWeightState,
  formData: FormData,
): Promise<LogWeightState> {
  const parsed = LogSchema.safeParse({
    kg: formData.get("kg"),
    date: formData.get("date") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const date = dayKey(parsed.data.date ? new Date(parsed.data.date) : new Date());

  await db.weightEntry.upsert({
    where: { date },
    create: { date, kg: parsed.data.kg, note: parsed.data.note ?? null },
    update: { kg: parsed.data.kg, note: parsed.data.note ?? null },
  });

  revalidatePath("/weight");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteWeight(
  _prev: LogWeightState,
  formData: FormData,
): Promise<LogWeightState> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid id" };
  await db.weightEntry.delete({ where: { id } });
  revalidatePath("/weight");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Re-run macro calculation using the current 7-day rolling average as the
 * bodyweight input, then store that weight as `lastMacroWeightKg`.
 */
export async function refreshMacrosFromAvg(): Promise<LogWeightState> {
  const profile = await db.profile.findUnique({ where: { id: 1 } });
  if (!profile) return { error: "Profile not set" };

  const entries = await db.weightEntry.findMany({
    orderBy: { date: "desc" },
    take: 7,
  });
  if (entries.length === 0) return { error: "No weight entries yet" };
  const avg =
    entries.reduce((s, e) => s + e.kg, 0) / entries.length;

  const bodyFatPct = await getLatestBodyFatPct();
  const macros = computeMacros({
    heightCm: profile.heightCm,
    weightKg: avg,
    bodyFatPct: bodyFatPct ?? undefined,
    age: profile.age,
    sex: profile.sex as "male" | "female",
    activityLevel: profile.activityLevel as
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active",
    goal: profile.goal as "cut" | "maintain" | "gain",
    workoutKcalWeekly: profile.workoutKcalWeekly ?? 0,
  });

  await db.profile.update({
    where: { id: 1 },
    data: {
      weightKg: avg,
      kcalTarget: macros.kcalTarget,
      proteinG: macros.proteinG,
      carbG: macros.carbG,
      fatG: macros.fatG,
      waterMlTarget: macros.waterMlTarget,
      lastMacroWeightKg: avg,
      lastMacroBodyFatPct: bodyFatPct,
    },
  });

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/weight");
  return { ok: true };
}

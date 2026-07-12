"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { dayKey } from "../../lib/weight";
import { computeMacros } from "../../lib/macros";
import { planActivityKcalPerDay } from "../../lib/training";
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

  const userId = await requireUserId();
  const date = dayKey(parsed.data.date ? new Date(parsed.data.date) : new Date());

  await db.weightEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, kg: parsed.data.kg, note: parsed.data.note ?? null },
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
  const userId = await requireUserId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid id" };
  await db.weightEntry.deleteMany({ where: { id, userId } });
  revalidatePath("/weight");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Re-run macro calculation using the current 7-day rolling average as the
 * bodyweight input, then store that weight as `lastMacroWeightKg`.
 */
export async function refreshMacrosFromAvg(): Promise<LogWeightState> {
  const userId = await requireUserId();
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) return { error: "Profile not set" };

  const entries = await db.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 7,
  });
  if (entries.length === 0) return { error: "No weight entries yet" };
  const avg =
    entries.reduce((s, e) => s + e.kg, 0) / entries.length;

  const bodyFatPct = await getLatestBodyFatPct(userId);
  const macros = computeMacros({
    heightCm: profile.heightCm,
    weightKg: avg,
    bodyFatPct: bodyFatPct ?? undefined,
    age: profile.age,
    sex: profile.sex as "male" | "female",
    // Grundbedarf immer "sedentary"; die Aktivität kommt aus dem Trainingsplan.
    activityLevel: "sedentary",
    goal: profile.goal as "cut" | "maintain" | "gain",
    thyroidReduced: profile.thyroidReduced,
    exerciseKcalPerDay: profile.activityEnabled
      ? planActivityKcalPerDay(avg)
      : 0,
  });

  await db.profile.update({
    where: { userId },
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { dayKey } from "../../lib/weight";
import { computeMacros } from "../../lib/macros";
import { planActivityKcalPerDay } from "../../lib/training";

const MeasurementSchema = z
  .object({
    waistCm: z.coerce.number().min(40).max(200).optional(),
    hipCm: z.coerce.number().min(50).max(200).optional(),
    bodyFatPct: z.coerce.number().min(3).max(60).optional(),
    date: z.string().optional(),
    note: z.string().max(200).optional(),
  })
  .refine(
    (v) => v.waistCm != null || v.hipCm != null || v.bodyFatPct != null,
    { message: "Mindestens ein Messwert erforderlich" },
  );

export type SaveMeasurementState = { error?: string; ok?: boolean };

function emptyToUndef(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = typeof v === "string" ? v : "";
  return s.trim() === "" ? undefined : s;
}

export async function saveMeasurement(
  _prev: SaveMeasurementState,
  formData: FormData,
): Promise<SaveMeasurementState> {
  const parsed = MeasurementSchema.safeParse({
    waistCm: emptyToUndef(formData.get("waistCm")),
    hipCm: emptyToUndef(formData.get("hipCm")),
    bodyFatPct: emptyToUndef(formData.get("bodyFatPct")),
    date: emptyToUndef(formData.get("date")),
    note: emptyToUndef(formData.get("note")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const date = dayKey(
    parsed.data.date ? new Date(parsed.data.date) : new Date(),
  );
  const data = {
    waistCm: parsed.data.waistCm ?? null,
    hipCm: parsed.data.hipCm ?? null,
    bodyFatPct: parsed.data.bodyFatPct ?? null,
    note: parsed.data.note ?? null,
  };

  await db.measurementEntry.upsert({
    where: { date },
    create: { date, ...data },
    update: data,
  });

  // If body-fat % moved more than 1 percentage point since the last macro
  // calc, recompute macros so kcal (Katch-McArdle) and protein (LBM-based)
  // pick up the new composition.
  if (parsed.data.bodyFatPct != null) {
    const profile = await db.profile.findUnique({ where: { id: 1 } });
    if (profile) {
      const last = profile.lastMacroBodyFatPct;
      if (last == null || Math.abs(parsed.data.bodyFatPct - last) >= 1) {
        const macros = computeMacros({
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          bodyFatPct: parsed.data.bodyFatPct,
          age: profile.age,
          sex: profile.sex as "male" | "female",
          // Grundbedarf immer "sedentary"; Aktivität kommt aus dem Trainingsplan.
          activityLevel: "sedentary",
          goal: profile.goal as "cut" | "maintain" | "gain",
          exerciseKcalPerDay: planActivityKcalPerDay(profile.weightKg),
        });
        await db.profile.update({
          where: { id: 1 },
          data: {
            kcalTarget: macros.kcalTarget,
            proteinG: macros.proteinG,
            carbG: macros.carbG,
            fatG: macros.fatG,
            waterMlTarget: macros.waterMlTarget,
            lastMacroBodyFatPct: parsed.data.bodyFatPct,
          },
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/measurements");
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteMeasurement(
  _prev: SaveMeasurementState,
  formData: FormData,
): Promise<SaveMeasurementState> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid id" };
  await db.measurementEntry.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/measurements");
  revalidatePath("/profile");
  return { ok: true };
}

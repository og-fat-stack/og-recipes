"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { getProfile } from "../../lib/profile";
import { recomputeProfileMacros, weekStart } from "../../lib/training";
import {
  generateTrainingDraft,
  type ContextPreference,
} from "../../lib/ai/generateTraining";

export type GenerateTrainingState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: string };

function parseContext(v: FormDataEntryValue | null): ContextPreference {
  const s = (v ?? "").toString();
  return s === "home" || s === "gym" ? s : "mixed";
}

function parseDays(v: FormDataEntryValue | null): number | "auto" {
  const s = (v ?? "auto").toString();
  if (s === "auto") return "auto";
  const n = Number(s);
  return Number.isInteger(n) && n >= 3 && n <= 6 ? n : "auto";
}

export async function generateWeeklyTraining(
  _prev: GenerateTrainingState,
  formData: FormData,
): Promise<GenerateTrainingState> {
  const profile = await getProfile();
  if (!profile) {
    return { status: "error", error: "Zuerst das Profil ausfüllen." };
  }

  const contextPreference = parseContext(formData.get("contextPreference"));
  const daysPerWeek = parseDays(formData.get("daysPerWeek"));

  try {
    const draft = await generateTrainingDraft({
      profile,
      contextPreference,
      daysPerWeek,
    });

    const ws = weekStart();
    await db.trainingPlan.deleteMany({ where: { weekStart: ws } });
    await db.trainingPlan.create({
      data: {
        weekStart: ws,
        notes: draft.weekNotes ?? null,
        sessions: {
          create: draft.sessions.map((s) => ({
            day: s.day,
            context: s.context,
            name: s.name,
            focus: s.focus,
            durationMin: s.durationMin,
            kcalEstimate: s.kcalEstimate,
            exercises: s.exercises,
            notes: s.notes ?? null,
          })),
        },
      },
    });

    await recomputeProfileMacros();

    revalidatePath("/training");
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/plan");
    return { status: "ok" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Unbekannter Fehler",
    };
  }
}

export async function deleteCurrentTrainingPlan(): Promise<void> {
  const ws = weekStart();
  await db.trainingPlan.deleteMany({ where: { weekStart: ws } });
  await recomputeProfileMacros();
  revalidatePath("/training");
  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/plan");
}

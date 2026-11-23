"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import {
  isStaleGeneration,
  parseWeekSel,
  weekStart,
  weekStartFor,
} from "../../lib/plan";
import { berlinWeekdayIndex } from "../../lib/time";
import { runPlanGeneration } from "../../lib/planGeneration";

export type GeneratePlanState =
  | { status: "idle" }
  | { status: "started" }
  | { status: "error"; error: string };

function parseDay(v: FormDataEntryValue | null, fallback: number): number {
  // Fehlt das Feld (Optionen eingeklappt), ist v null/"" — dann den Fallback nehmen.
  // Wichtig: Number(null) und Number("") sind 0, würden also fälschlich als gültiger
  // Tag 0 (Montag) durchgehen und den Bereich auf einen Tag zusammenschrumpfen.
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback;
}

export async function generateWeeklyPlan(
  _prev: GeneratePlanState,
  formData: FormData,
): Promise<GeneratePlanState> {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (!profile) {
    return { status: "error", error: "Zuerst das Profil ausfüllen." };
  }

  const week = parseWeekSel(formData.get("week")?.toString());
  const ws = weekStartFor(week);

  // Für vergangene Tage wird nie geplant: in der laufenden Woche frühestens ab
  // heute, in der kommenden Woche liegt ohnehin alles in der Zukunft.
  const minDay = week === "this" ? berlinWeekdayIndex() : 0;
  const startDay = Math.max(parseDay(formData.get("startDay"), minDay), minDay);
  let endDay = parseDay(formData.get("endDay"), 6);
  if (endDay < startDay) endDay = startDay;
  const useUpIngredients = (formData.get("useUpIngredients") ?? "")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Nicht doppelt loslegen, wenn für diese Woche schon eine Generierung läuft.
  const existingJob = await db.planGeneration.findUnique({
    where: { userId_weekStart: { userId, weekStart: ws } },
  });
  if (existingJob?.status === "generating" && !isStaleGeneration(existingJob)) {
    return {
      status: "error",
      error: "Für diese Woche läuft bereits eine Generierung — bitte kurz warten.",
    };
  }

  await db.planGeneration.upsert({
    where: { userId_weekStart: { userId, weekStart: ws } },
    create: { userId, weekStart: ws, status: "generating", error: null },
    update: { status: "generating", error: null },
  });
  revalidatePath("/plan");

  // Die eigentliche Arbeit (Claude-Call + DB-Schreiben) läuft NACH der Antwort
  // an den Browser weiter (Next.js `after()`, per waitUntil auch ohne offene
  // Verbindung) — der Nutzer muss nicht warten und kann die App normal nutzen,
  // während im Hintergrund geplant wird. Der bestehende Plan bleibt sichtbar,
  // bis der neue fertig ist (Löschen/Ersetzen passiert erst danach).
  after(async () => {
    await runPlanGeneration({ userId, profile, ws, startDay, endDay, useUpIngredients });
    revalidatePath("/plan");
    revalidatePath("/plan/shopping");
    revalidatePath("/");
    revalidatePath("/recipes");
  });

  return { status: "started" };
}

/**
 * Bricht eine laufende Hintergrund-Generierung für die gewählte Woche ab.
 * Löscht nur die Tracking-Zeile — ein bereits laufender Claude-Call lässt sich
 * nicht abbrechen, aber der Abschluss-Check in generateWeeklyPlan() (oben)
 * verwirft dessen Ergebnis, sobald diese Zeile fehlt, statt den bestehenden
 * Plan zu überschreiben.
 */
export async function cancelPlanGeneration(week: string): Promise<void> {
  const userId = await requireUserId();
  const ws = weekStartFor(parseWeekSel(week));
  await db.planGeneration.deleteMany({ where: { userId, weekStart: ws } });
  revalidatePath("/plan");
}

export async function deleteCurrentPlan(): Promise<void> {
  const userId = await requireUserId();
  const ws = weekStart();
  await db.mealPlan.deleteMany({ where: { userId, weekStart: ws } });
  await db.planGeneration.deleteMany({ where: { userId, weekStart: ws } });
  revalidatePath("/plan");
  revalidatePath("/plan/shopping");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import {
  getRecentMealTitles,
  parseWeekSel,
  pickKnownMainMealRecipes,
  weekStart,
  weekStartFor,
} from "../../lib/plan";
import { berlinWeekdayIndex } from "../../lib/time";
import { generatePlanDraft } from "../../lib/ai/generatePlan";
import { buildSnackPlan, upsertSnackRecipes } from "../../lib/snacks";
import { PLAN_PROMPT_VERSION } from "../../lib/ai/promptVersions";
import { getClaudeMemoryText } from "../../lib/claudeMemory";
import { logGenerationFailure } from "../../lib/generationLog";

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
  if (existingJob?.status === "generating") {
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
    try {
      const [recentTitles, knownMainPool, claudeMemory] = await Promise.all([
        getRecentMealTitles(userId, 14),
        pickKnownMainMealRecipes(userId, 2),
        getClaudeMemoryText(userId),
      ]);

      const knownSummaries = knownMainPool.map((r) => ({
        title: r.title,
        cuisine: r.cuisine,
        portions: r.portions,
        kcalPerPortion: r.kcalPerPortion,
        proteinG: r.proteinG,
        carbG: r.carbG,
        fatG: r.fatG,
        batchStorageDays: r.batchStorageDays,
      }));

      // Feste Snack-Slots: deterministisch aus der Bibliothek belegt; ihre
      // Makros werden im Generator von den Tageszielen abgezogen, damit die
      // 3 Mahlzeiten kulinarisch realistische Eiweißmengen tragen.
      const snackPlan = buildSnackPlan({
        proteinTargetG: profile.proteinG,
        startDay,
        endDay,
      });

      const draft = await generatePlanDraft({
        profile,
        recentMealTitles: recentTitles,
        knownMainRecipes: knownSummaries,
        dayRange: { start: startDay, end: endDay },
        useUpIngredients,
        claudeMemory,
        budgetConscious: profile.budgetConscious,
        snackPlan,
      });

      // Abbruch-Check: Wurde die Generierung inzwischen abgebrochen (Zeile
      // gelöscht/verändert, z. B. über cancelPlanGeneration), während Claude
      // noch gearbeitet hat? Dann NICHTS übernehmen — der bestehende Plan
      // bleibt unangetastet.
      const stillWanted = await db.planGeneration.findUnique({
        where: { userId_weekStart: { userId, weekStart: ws } },
      });
      if (!stillWanted || stillWanted.status !== "generating") {
        return;
      }

      await db.mealPlan.deleteMany({ where: { userId, weekStart: ws } });

      const newRecipeIds: number[] = [];
      for (const r of draft.newRecipes) {
        const created = await db.recipe.create({
          data: {
            userId,
            title: r.title,
            cuisine: r.cuisine,
            portions: r.portions,
            kcalPerPortion: r.kcalPerPortion,
            proteinG: r.proteinG,
            carbG: r.carbG,
            fatG: r.fatG,
            batchStorageDays: r.batchStorageDays,
            ingredients: r.ingredients,
            steps: r.steps,
            techniques: r.techniques,
            promptVersion: PLAN_PROMPT_VERSION,
          },
        });
        newRecipeIds.push(created.id);
      }

      const allIds = [...knownMainPool.map((r) => r.id), ...newRecipeIds];

      // Sicherheitsnetz: nie etwas außerhalb des erlaubten Bereichs anlegen —
      // insbesondere keine vergangenen Tage der laufenden Woche.
      const assignments = draft.assignments.filter(
        (a) => a.day >= startDay && a.day <= endDay,
      );

      // Snack-Rezepte anlegen/aktualisieren und die festen Snack-Slots füllen.
      const plannedSnacks = [...snackPlan.byDay.entries()];
      const snackIds = await upsertSnackRecipes(
        userId,
        plannedSnacks.flatMap(([, list]) => list.map((p) => p.snack)),
      );
      const snackMeals = plannedSnacks.flatMap(([day, list]) =>
        list.map((p) => ({
          day,
          slot: p.slot,
          recipeId: snackIds.get(p.snack.title)!,
        })),
      );

      await db.mealPlan.create({
        data: {
          userId,
          weekStart: ws,
          meals: {
            create: [
              ...assignments.map((a) => ({
                day: a.day,
                slot: a.slot,
                recipeId: allIds[a.recipeIndex],
              })),
              ...snackMeals,
            ],
          },
        },
      });

      await db.planGeneration.delete({
        where: { userId_weekStart: { userId, weekStart: ws } },
      });
    } catch (e) {
      // Roh-Antwort + Fehler festhalten, BEVOR der Nutzer-Status gesetzt wird —
      // das Diagnose-Material wäre sonst mit diesem Request verloren.
      await logGenerationFailure(userId, "plan", e, PLAN_PROMPT_VERSION);
      await db.planGeneration.update({
        where: { userId_weekStart: { userId, weekStart: ws } },
        data: {
          status: "error",
          error: e instanceof Error ? e.message : "Unbekannter Fehler",
        },
      });
    }
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

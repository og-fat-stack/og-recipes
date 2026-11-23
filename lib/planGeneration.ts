import { db } from "./db";
import type { Profile } from "./generated/prisma/client";
import { getRecentMealTitles } from "./plan";
import { buildPlan } from "./planner";
import { getLastFishGroups } from "./fish";
import { buildSnackPlan, upsertSnackRecipes } from "./snacks";
import { sideSlotFor, upsertSideRecipes } from "./sides";
import { FIND_PROMPT_VERSION, PLAN_PROMPT_VERSION } from "./ai/promptVersions";
import { getClaudeMemoryText } from "./claudeMemory";
import { logGenerationFailure } from "./generationLog";
import { planMonth } from "./season";

/**
 * Erzeugt den Plan für einen Tagesbereich und speichert ihn — der Teil von
 * generateWeeklyPlan(), der im Hintergrund läuft. Erwartet eine
 * PlanGeneration-Zeile mit status "generating" (Abbruch-Signal) und räumt sie
 * am Ende ab bzw. setzt sie auf "error". Wirft nie.
 */
export async function runPlanGeneration(args: {
  userId: number;
  profile: Profile;
  ws: Date;
  startDay: number;
  endDay: number;
  useUpIngredients: string[];
}): Promise<void> {
  const { userId, profile, ws, startDay, endDay, useUpIngredients } = args;
  try {
    const [recentTitles, claudeMemory, lastFishGroups] = await Promise.all([
      getRecentMealTitles(userId, 14, ws),
      getClaudeMemoryText(userId),
      getLastFishGroups(userId, ws),
    ]);

    // Feste Snack-Slots: deterministisch aus der Bibliothek belegt; ihre
    // Makros werden von den Tageszielen der 3 Mahlzeiten abgezogen.
    const month = planMonth(ws);
    const snackPlan = buildSnackPlan({
      proteinTargetG: profile.proteinG,
      startDay,
      endDay,
      month,
    });

    // Sammlung + Web-Suche → Claude wählt aus → App skaliert Portionen und
    // ergänzt Beilagen (lib/planner.ts). Claude erfindet keine Rezepte.
    const { candidates, selection } = await buildPlan({
      userId,
      profile,
      dayRange: { start: startDay, end: endDay },
      snackPlan,
      recentTitles,
      useUpIngredients,
      claudeMemory,
      lastFishGroups,
      month,
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

    // Sicherheitsnetz: nie etwas außerhalb des erlaubten Bereichs anlegen —
    // insbesondere keine vergangenen Tage der laufenden Woche.
    const assignments = selection.assignments.filter(
      (a) => a.day >= startDay && a.day <= endDay,
    );

    // Neu gefundene Rezepte nur speichern, wenn sie im Plan landen — die
    // übrigen Web-Treffer verschwinden wieder.
    const recipeIdByIndex = new Map<number, number>();
    for (const a of assignments) {
      if (recipeIdByIndex.has(a.recipeIndex)) continue;
      const c = candidates[a.recipeIndex];
      if (c.id != null) {
        recipeIdByIndex.set(a.recipeIndex, c.id);
        continue;
      }
      const d = c.draft!;
      const created = await db.recipe.create({
        data: {
          userId,
          title: d.title,
          cuisine: d.cuisine,
          mealType: d.mealType,
          portions: d.portions,
          kcalPerPortion: d.kcalPerPortion,
          proteinG: d.proteinG,
          carbG: d.carbG,
          fatG: d.fatG,
          batchStorageDays: d.batchStorageDays,
          ingredients: d.ingredients,
          steps: d.steps,
          techniques: d.techniques,
          sourceUrl: c.url ?? null,
          promptVersion: FIND_PROMPT_VERSION,
          macroSource: d.macroSource ?? null,
          macroCoverage: d.macroCoverage ?? null,
          ratingValue: c.rating?.value ?? null,
          ratingCount: c.rating?.count ?? null,
        },
      });
      recipeIdByIndex.set(a.recipeIndex, created.id);
    }

    // Portionsfaktor + Beilage je Mahlzeit (von der App berechnet).
    const scaledBySlot = new Map(
      selection.scaled.map((m) => [`${m.day}-${m.slot}`, m]),
    );
    const sideIds = await upsertSideRecipes(
      userId,
      selection.scaled.flatMap((m) => (m.side ? [m.side.key] : [])),
    );
    const sideMeals = selection.scaled.flatMap((m) =>
      m.side && m.day >= startDay && m.day <= endDay
        ? [
            {
              day: m.day,
              slot: sideSlotFor(m.slot),
              recipeId: sideIds.get(m.side.key)!,
              portionsFromBatch: m.side.units,
            },
          ]
        : [],
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
              recipeId: recipeIdByIndex.get(a.recipeIndex)!,
              portionsFromBatch:
                scaledBySlot.get(`${a.day}-${a.slot}`)?.factor ?? 1,
            })),
            ...sideMeals,
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
}

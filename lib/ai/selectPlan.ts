import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";
import { classifyFishRecipe, type FishGroup } from "../fish";
import type { SnackPlan } from "../snacks";
import type { SideDef } from "../sides";
import type { Ingredient } from "../recipe";
import {
  dayTotals,
  scalePlan,
  validateTotals,
  type MealSlot,
  type Pick,
  type ScaledMeal,
} from "../planScaling";
import { stripCodeFences } from "./analyzeNutrition";
import { GenerationError } from "./generationError";

/**
 * Wochenplan aus ECHTEN Rezepten: Claude wählt aus den Kandidaten (eigene
 * Sammlung + per Web-Suche gefundene Rezepte) aus, welches Rezept wann
 * gegessen wird. Claude erfindet und verändert keine Rezepte — Portionsgröße
 * und Beilagen rechnet die App (lib/planScaling.ts).
 */

export type PlanCandidate = {
  title: string;
  cuisine: string;
  mealType: "breakfast" | "main";
  portions: number;
  kcalPerPortion: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  batchStorageDays: number;
  ingredients: Ingredient[];
  /** Herkunft für Claude: gemocht, Sammlung, neu gefunden, kürzlich gegessen. */
  origin: "liked" | "collection" | "found";
  recent: boolean;
};

const SelectionSchema = z.object({
  assignments: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        slot: z.enum(["breakfast", "lunch", "dinner"]),
        recipeIndex: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(21),
  allowedSides: z.array(z.string()).default([]),
});

export type PlanSelection = {
  assignments: { day: number; slot: MealSlot; recipeIndex: number }[];
  scaled: ScaledMeal[];
};

const SYSTEM_PROMPT = `Du bist der Wochenplaner einer privaten Koch-App. Du stellst aus einer Liste
ECHTER Rezepte (eigene Sammlung des Nutzers + im Web gefundene Rezepte) einen Wochenplan zusammen.
Du erfindest KEINE Rezepte und veränderst keine — du wählst nur aus, welches Rezept wann gegessen wird.

Was die App danach selbst macht (NICHT deine Aufgabe):
- Sie passt pro Mahlzeit die PORTIONSGRÖSSE an (0,5–2,5 Portionen), damit die Kalorien passen.
- Fehlt Eiweiß, legt sie eine einfache BEILAGE aus der Beilagen-Liste dazu (z. B. Skyr, Eier).
Deshalb musst du keine Kalorien exakt treffen. Die EIWEISSDICHTE (g Eiweiß pro 100 kcal, steht bei
jedem Kandidaten) sollte grob passen — aber Abwechslung und die Regeln unten gehen IMMER vor.

Pro Tag 3 Mahlzeiten: breakfast (nur Kandidaten mit Typ Frühstück), lunch und dinner (nur Typ
Hauptgericht). Feste Snacks plant die App selbst, sie gehören nicht in deine Antwort.

AUSWAHL-REGELN:
- GEMOCHTE Rezepte (👍) sind bewährt — plane 1–2 davon ein, wenn vorhanden.
- Kandidaten mit "kürzlich gegessen" nur, wenn sonst nichts passt.
- KOCH-RHYTHMUS: Der Nutzer macht kein Meal-Prep. Ein Hauptgericht darf mittags und abends am
  selben Tag oder am Folgetag als Reste wiederkommen (höchstens 2 Tage nach dem Kochen und
  innerhalb von "hält X Tage"). Typisch für eine volle Woche: 3–5 verschiedene Hauptgerichte,
  jedes 1–2 Tage im Einsatz. Nicht die halbe Woche dasselbe.
- FRÜHSTÜCK: 2–3 verschiedene pro voller Woche, abwechselnd verteilt.
- ABWECHSLUNG: verschiedene Küchen und Protein-Anker über die Woche.
- Ernährung und harte Einschränkungen des Nutzers sind absolut: Kandidaten, die dagegen
  verstoßen, NIE einplanen.
- FLEISCH (DGE): das Fleisch-Budget im Input gilt für alle Mahlzeiten zusammen (Gramm-Angaben pro
  Portion stehen bei den Zutaten; Portionen werden typischerweise 0,75–1,5-fach skaliert).
  Höchstens ein Hauptgericht mit rotem Fleisch.
- FISCH: höchstens so viele Fisch-Mahlzeiten wie im Input steht (Fisch-Rotation) — nicht mehr,
  auch wenn Fischgerichte eiweißreich sind.
- Ein Rezept belegt höchstens 3 Mahlzeiten der Woche.
- "Zutaten zum Aufbrauchen" bevorzugen, wenn ein Kandidat sie enthält.

BEILAGEN: Gib in "allowedSides" die Schlüssel aller Beilagen aus der Liste an, die zu Ernährung und
harten Einschränkungen des Nutzers passen (z. B. keine Milchprodukte → kein skyr/kraeuterquark/
huettenkaese).

Antworte AUSSCHLIESSLICH mit JSON (kein Markdown):
{"assignments":[{"day":0,"slot":"breakfast","recipeIndex":3},{"day":0,"slot":"lunch","recipeIndex":0}],
 "allowedSides":["skyr","eier"]}
- "assignments" hat EXAKT die im Input genannte Anzahl Einträge, jede (day, slot)-Kombination im
  Bereich genau einmal. recipeIndex = Nummer in der Kandidatenliste.`;

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function candidateLine(c: PlanCandidate, i: number): string {
  const density = c.kcalPerPortion > 0 ? Math.round((c.proteinG / c.kcalPerPortion) * 1000) / 10 : 0;
  const fish = classifyFishRecipe(`${c.title} ${c.ingredients.map((x) => x.name).join(" ")}`);
  const tags = [
    c.mealType === "breakfast" ? "Frühstück" : "Hauptgericht",
    fish ? `🐟 FISCH (${fish === "omega3" ? "Omega-3" : "Weißfisch"})` : "",
    c.origin === "liked" ? "👍 gemocht" : c.origin === "found" ? "neu gefunden" : "Sammlung",
    c.recent ? "kürzlich gegessen" : "",
  ]
    .filter(Boolean)
    .join(", ");
  // Alle Zutaten (wichtig für Ausschlüsse), Gramm pro Portion wo bekannt.
  const names = c.ingredients
    .map((ing) =>
      (ing.grams ?? 0) > 0
        ? `${ing.name} ≈${Math.round((ing.grams ?? 0) / Math.max(1, c.portions))} g`
        : ing.name,
    )
    .join(", ")
    .slice(0, 700);
  return `[${i}] "${c.title}" — ${tags}; ${c.cuisine}; pro Portion ${c.kcalPerPortion} kcal, ${c.proteinG} E / ${c.carbG} K / ${c.fatG} F (${density} g E/100 kcal); hält ${c.batchStorageDays} Tage
     Zutaten pro Portion: ${names}`;
}

export async function selectPlan(args: {
  profile: Profile;
  candidates: PlanCandidate[];
  dayRange: { start: number; end: number };
  snackPlan: SnackPlan;
  sides: SideDef[];
  claudeMemory?: string | null;
  lastFishGroups: FishGroup[];
  useUpIngredients: string[];
}): Promise<PlanSelection> {
  const { profile, candidates, snackPlan, sides } = args;
  const { start: startDay, end: endDay } = args.dayRange;
  const dayCount = endDay - startDay + 1;
  const expectedSlots = dayCount * 3;

  // Mahlzeiten-Ziel je Tag = Tagesziel minus feste Snacks.
  const mealTargets = new Map<number, { kcal: number; protein: number }>();
  for (let day = startDay; day <= endDay; day++) {
    const snack = snackPlan.macrosByDay.get(day) ?? { kcal: 0, protein: 0 };
    mealTargets.set(day, {
      kcal: profile.kcalTarget - snack.kcal,
      protein: Math.max(0, profile.proteinG - snack.protein),
    });
  }
  const anyTarget = mealTargets.get(startDay) ?? { kcal: profile.kcalTarget, protein: profile.proteinG };
  const perMeal = { kcal: Math.round(anyTarget.kcal / 3), protein: Math.round(anyTarget.protein / 3) };

  const meatCapG = Math.round((300 * dayCount) / 7);
  const maxFish = profile.vegetarian ? 0 : dayCount >= 4 ? 2 : 1;
  const fishCount = `${maxFish === 2 ? "1–2" : "höchstens 1"} Fisch-Mahlzeit(en)`;
  let fishLine: string;
  if (profile.vegetarian) fishLine = "entfällt (vegetarisch).";
  else if (args.lastFishGroups.length === 1)
    fishLine =
      args.lastFishGroups[0] === "omega3"
        ? `zuletzt Omega-3-Fisch → diese Woche ${fishCount} mit WEISSFISCH (Seelachs, Kabeljau, Schellfisch, Scholle), falls ein Kandidat passt.`
        : `zuletzt Weißfisch → diese Woche ${fishCount} mit OMEGA-3-Fisch (Sardine, Hering, Makrele, Lachs), falls ein Kandidat passt.`;
  else fishLine = `${fishCount}, falls ein Kandidat passt (freie Wahl der Sorte).`;

  const memory = args.claudeMemory?.trim();
  const user = `Tagesbereich: ${DAY_LABELS[startDay]}–${DAY_LABELS[endDay]} (day ${startDay}..${endDay}, 0=Mo). Plane EXAKT ${expectedSlots} assignments.
Ziele der 3 Mahlzeiten zusammen pro Tag (feste Snacks schon abgezogen): ~${anyTarget.kcal} kcal, ~${anyTarget.protein} g Eiweiß.
Richtwert pro Mahlzeit: ~${perMeal.kcal} kcal, ~${perMeal.protein} g Eiweiß (≈ ${Math.round((perMeal.protein / Math.max(1, perMeal.kcal)) * 1000) / 10} g E/100 kcal).
Ernährung: ${profile.vegetarian ? "VEGETARISCH" : "alles"}.
Fleisch-Budget für diesen Bereich: max. ${meatCapG} g Fleisch + Wurst insgesamt.
Fisch-Rotation: ${fishLine}
${args.useUpIngredients.length ? `Zutaten zum Aufbrauchen: ${args.useUpIngredients.join(", ")}\n` : ""}${memory ? `HARTE EINSCHRÄNKUNGEN & VORLIEBEN (nicht verhandelbar):\n${memory}\n` : ""}
Beilagen-Liste (Schlüssel: Inhalt, pro Einheit):
${sides.map((s) => `- ${s.key}: ${s.title}, ${s.kcal} kcal, ${s.protein} g E`).join("\n")}

Kandidaten:
${candidates.map(candidateLine).join("\n")}`;

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: user },
  ];

  for (let attempt = 1; ; attempt++) {
    const msg = await callClaude({
      model: "planner",
      system: SYSTEM_PROMPT,
      maxTokens: 64000,
      // Auswahl statt Erfindung — braucht wenig Denktiefe, und der ganze
      // Ablauf muss in das Zeitlimit des Hintergrund-Jobs passen.
      effort: "low",
      messages,
    });
    const rawText = extractText(msg);
    const fail = (m: string) =>
      new GenerationError(m, { rawResponse: rawText, stopReason: msg.stop_reason });
    if (msg.stop_reason === "max_tokens") throw fail("Claudes Antwort wurde abgeschnitten.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFences(rawText));
    } catch {
      throw fail("Claude hat kein gültiges JSON geliefert.");
    }
    const result = SelectionSchema.safeParse(parsed);
    if (!result.success) {
      throw fail(
        "Plan ungültig: " +
          result.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }

    // Struktur prüfen: Bereich, Doppelungen, Vollständigkeit, Mahlzeit-Typ.
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const a of result.data.assignments) {
      const key = `${a.day}-${a.slot}`;
      const c = candidates[a.recipeIndex];
      if (a.day < startDay || a.day > endDay) problems.push(`Tag ${a.day} liegt außerhalb des Bereichs`);
      else if (seen.has(key)) problems.push(`${key} doppelt belegt`);
      else if (!c) problems.push(`recipeIndex ${a.recipeIndex} gibt es nicht`);
      else if ((a.slot === "breakfast") !== (c.mealType === "breakfast"))
        problems.push(`${key}: "${c.title}" ist ${c.mealType === "breakfast" ? "ein Frühstück" : "kein Frühstück"}`);
      seen.add(key);
    }
    if (seen.size !== expectedSlots) problems.push(`${seen.size} statt ${expectedSlots} Slots belegt`);

    // Feste Regeln, die die App selbst nachprüft.
    const uses = new Map<number, number>();
    for (const a of result.data.assignments) uses.set(a.recipeIndex, (uses.get(a.recipeIndex) ?? 0) + 1);
    // Weiche Regeln: werden zurückgemeldet, verwerfen den Plan aber nach dem
    // Korrekturversuch nicht (anders als Strukturfehler oben).
    const softProblems: string[] = [];
    for (const [i, n] of uses)
      if (n > 3 && candidates[i]) softProblems.push(`"${candidates[i].title}" belegt ${n} Mahlzeiten (max. 3)`);
    const fishMeals = result.data.assignments.filter((a) => {
      const c = candidates[a.recipeIndex];
      return c && classifyFishRecipe(`${c.title} ${c.ingredients.map((i) => i.name).join(" ")}`);
    }).length;
    if (fishMeals > maxFish)
      softProblems.push(`${fishMeals} Fisch-Mahlzeiten (max. ${maxFish}, Fischgerichte sind mit 🐟 markiert)`);

    let scaled: ScaledMeal[] = [];
    let macroProblem: string | null = null;
    if (problems.length === 0) {
      const allowed = new Set(result.data.allowedSides);
      const sideOptions = sides.filter((s) => allowed.has(s.key));
      const picks: Pick[] = result.data.assignments.map((a) => {
        const c = candidates[a.recipeIndex];
        return {
          day: a.day,
          slot: a.slot,
          recipe: { kcal: c.kcalPerPortion, protein: c.proteinG, carb: c.carbG, fat: c.fatG },
        };
      });
      scaled = scalePlan({ picks, mealTargets, sides: sideOptions });
      const totals = dayTotals({
        picks,
        scaled,
        sides: sideOptions,
        snackMacrosByDay: snackPlan.macrosByDay,
      });
      macroProblem = validateTotals(totals, profile.kcalTarget, profile.proteinG);
    }

    const soft = [...softProblems, ...(macroProblem ? [macroProblem] : [])];
    if (problems.length === 0 && (soft.length === 0 || attempt >= 2)) {
      // Knapp verfehlte Tagesziele oder eine Fischmahlzeit zu viel nach dem
      // Korrekturversuch sind kein Grund, den ganzen Plan zu verwerfen.
      if (soft.length) console.warn(`[plan] Plan mit Abweichungen übernommen: ${soft.join("; ")}`);
      return { assignments: result.data.assignments, scaled };
    }
    problems.push(...soft);
    if (attempt >= 2) {
      throw fail(`Kein gültiger Plan aus den vorhandenen Rezepten: ${problems.join("; ")}`);
    }
    messages.push(
      { role: "assistant", content: rawText },
      {
        role: "user",
        content: `Dein Plan hat Probleme:
${problems.map((p) => `- ${p}`).join("\n")}

Wähle neu (gleiches JSON-Format) und halte alle Regeln ein. Bei Eiweiß-Problemen: an den
betroffenen Tagen eiweißdichtere Kandidaten wählen. Bei Kalorien-Problemen: Kandidaten, deren
Portion näher am Richtwert liegt.`,
      },
    );
  }
}

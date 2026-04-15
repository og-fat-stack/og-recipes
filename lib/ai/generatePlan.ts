import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";
import { RecipeDraftSchema } from "./generateRecipe";

export const PlanAssignmentSchema = z.object({
  day: z.number().int().min(0).max(6),
  slot: z.enum(["breakfast", "lunch", "dinner"]),
  recipeIndex: z.number().int().min(0).max(15),
});

export const PlanDraftSchema = z.object({
  newRecipes: z.array(RecipeDraftSchema).min(1).max(6),
  assignments: z.array(PlanAssignmentSchema).length(21),
  weekNotes: z.string().max(2000).optional().nullable(),
});

export type PlanDraft = z.infer<typeof PlanDraftSchema>;

export type KnownRecipeSummary = {
  title: string;
  cuisine: string;
  portions: number;
  kcalPerPortion: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  batchStorageDays: number;
};

const SYSTEM_PROMPT = `Du bist ein persönlicher Koch-Coach und Meal-Prep-Planer für eine
Abnehm-App. Du planst eine Woche mit 3 Mahlzeiten pro Tag (Frühstück + Mittag + Abend, also
21 Slots).

Rhythmus und Struktur:
- Der Nutzer kocht die Hauptmahlzeiten (Mittag + Abend) in 3 Batches an Mo / Mi / Fr.
- Pro Hauptmahl-Batch: 1 Rezept mit 4–5 Portionen, das die 14 Mittag/Abend-Slots der Woche
  abdeckt. Typische Verteilung: Batch 1 (Mo gekocht) Mo–Di, Batch 2 (Mi gekocht) Mi–Do,
  Batch 3 (Fr gekocht) Fr–So. Haltbarkeit beachten.
- HAUPTMAHL-REZEPT-ROTATION: Wenn in "knownMainRecipes" Einträge stehen, sind das bereits
  vom Nutzer gekochte und bekannte Rezepte. Nutze diese als 2 der 3 Hauptmahl-Batches und
  generiere nur 1 NEUES Hauptmahl-Rezept. Das Ziel: jede Woche 1 neues Rezept + 2 bekannte.
  Wenn knownMainRecipes LEER ist (erste Woche), generiere alle 3 Hauptmahl-Rezepte neu.
- FRÜHSTÜCK ist separat: 1 einfaches Frühstücks-Rezept, bewusst simpel (Overnight Oats,
  Quark-Bowl, Rührei mit Haferflocken etc.). 5–10 Min. aktive Zeit. Portionen = 1.

Reihenfolge in "newRecipes":
- Zuerst das/die neuen Hauptmahl-Rezept(e), dann das Frühstück.
- Die knownMainRecipes erscheinen NICHT in "newRecipes" — sie sind bereits in der DB.

BUDGET — SEHR WICHTIG:
- Günstige Grundzutaten bevorzugen: Linsen, Kichererbsen, Bohnen, Eier, Haferflocken, Reis,
  Bulgur, Kartoffeln, Hähnchenschenkel, Thunfisch/Sardinen aus der Dose, Quark, Hüttenkäse,
  saisonales Gemüse (Kohl, Karotten, Zwiebeln, Zucchini).
- Teure Zutaten meiden: Lachs, Rindfleisch, Garnelen, Feta sparsam, Pinienkerne, Avocado,
  Halloumi.
- Eine Portion < 3 € (Supermarktpreise DE).

Vorgaben für JEDES neue Rezept:
- DER NUTZER HAT KEINE KÜCHENWAAGE. Mengen nur in: Stück, Tassen (1 Tasse ≈ 200 ml), EL, TL,
  Handvoll (≈ 30 g), Becher (500 g), Packung, Schale (250 g), Glas, mittel, faustgroß.
  Gramm-Werte nur in Klammern als Referenz.
- Anfängerfreundliche Schritte mit optischen Garchecks (keine Kerntemperaturen).
- Eiweißreich: Hauptmahlzeiten ≥ 35 g pro Portion. Frühstück ≥ 25 g pro Portion.
- In den Notizen eine kurze "Maße ohne Waage"-Sektion.
- Techniken als deutsche Tags (max 5).

Antworte AUSSCHLIESSLICH mit validem JSON (kein Markdown, keine Code-Fences).

FELDNAMEN SIND VERBINDLICH. Jedes RecipeDraft enthält EXAKT diese Schlüssel:
  title, cuisine, portions, kcalPerPortion, proteinG, carbG, fatG, batchStorageDays,
  ingredients, steps, techniques, notes

RECIPE-INDEX-KODIERUNG in "assignments":
- Die knownMainRecipes werden zuerst indexiert: index 0, 1, ... (in der Reihenfolge aus dem
  Input).
- Danach folgen die "newRecipes" in der Reihenfolge deiner Antwort: index K, K+1, ...
  (wobei K = Anzahl knownMainRecipes).
- Beispiel: knownMainRecipes hat 2 Einträge, newRecipes hat 2 Einträge (1 neu-Hauptmahl +
  1 Frühstück). Dann sind die Indizes: 0 = known[0], 1 = known[1], 2 = newRecipes[0]
  (neues Hauptmahl), 3 = newRecipes[1] (Frühstück).

Konkretes Beispiel-Antwort-Skelett:

{
  "newRecipes": [
    {
      "title": "...",
      "cuisine": "...",
      "portions": 5,
      "kcalPerPortion": 560,
      "proteinG": 40,
      "carbG": 55,
      "fatG": 16,
      "batchStorageDays": 4,
      "ingredients": [{ "name": "...", "qty": 1, "unit": "Tasse" }],
      "steps": ["..."],
      "techniques": ["..."],
      "notes": "Maße ohne Waage: ..."
    }
  ],
  "assignments": [
    { "day": 0, "slot": "breakfast", "recipeIndex": 3 },
    { "day": 0, "slot": "lunch", "recipeIndex": 0 },
    { "day": 0, "slot": "dinner", "recipeIndex": 0 }
    // ... insgesamt 21 Einträge
  ],
  "weekNotes": "Kurzer Kommentar inkl. grober Kostenschätzung pro Portion."
}

Pflicht:
- "assignments" hat EXAKT 21 Einträge — jede (day, slot)-Kombination genau einmal.
- day = 0 (Mo) bis 6 (So).
- slot = "breakfast" | "lunch" | "dinner".
- Alle Zahlenwerte sind Integer außer qty (darf Dezimal sein).`;

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export type GeneratePlanArgs = {
  profile: Profile;
  recentMealTitles: string[];
  knownMainRecipes: KnownRecipeSummary[];
};

export async function generatePlanDraft({
  profile,
  recentMealTitles,
  knownMainRecipes,
}: GeneratePlanArgs): Promise<PlanDraft> {
  const perMeal = {
    kcal: Math.round(profile.kcalTarget / 3),
    protein: Math.round(profile.proteinG / 3),
    carb: Math.round(profile.carbG / 3),
    fat: Math.round(profile.fatG / 3),
  };

  const knownBlock = knownMainRecipes.length
    ? `knownMainRecipes (wiederverwenden als Hauptmahl-Batches; Indizes 0..${knownMainRecipes.length - 1}):
${knownMainRecipes
  .map(
    (r, i) =>
      `  [${i}] "${r.title}" — ${r.cuisine}, ${r.portions} Portionen, ${r.kcalPerPortion} kcal, ${r.proteinG}E/${r.carbG}K/${r.fatG}F, hält ${r.batchStorageDays} Tage`,
  )
  .join("\n")}

Generiere nur ${3 - knownMainRecipes.length} neues Hauptmahl-Rezept + 1 Frühstücks-Rezept.`
    : `knownMainRecipes ist leer (erste Woche).
Generiere alle 3 Hauptmahl-Rezepte neu + 1 Frühstücks-Rezept (also "newRecipes" hat 4 Einträge).`;

  const userMsg = `Profil:
- Tagesziele: ${profile.kcalTarget} kcal · ${profile.proteinG} g E · ${profile.carbG} g K · ${profile.fatG} g F
- Pro Mahlzeit Zielwerte: ~${perMeal.kcal} kcal · ~${perMeal.protein} g E · ~${perMeal.carb} g K · ~${perMeal.fat} g F
- Ziel: ${profile.goal}
- Budget ist wichtig: günstige, alltagstaugliche Zutaten.

${knownBlock}

recentMeals (nicht für NEUE Rezepte verwenden): ${
    recentMealTitles.length
      ? recentMealTitles.map((t) => `"${t}"`).join(", ")
      : "keine"
  }

Erstelle die Wochenplanung (newRecipes + 21 assignments).`;

  const msg = await callClaude({
    model: "planner",
    system: SYSTEM_PROMPT,
    maxTokens: 10000,
    temperature: 0.85,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = stripCodeFences(extractText(msg));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Claude hat kein gültiges JSON geliefert.");
  }
  const result = PlanDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Plan ungültig: " +
        result.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    );
  }

  const seen = new Set<string>();
  for (const a of result.data.assignments) {
    const key = `${a.day}-${a.slot}`;
    if (seen.has(key)) throw new Error(`Doppelte Zuweisung für ${key}.`);
    seen.add(key);
  }
  if (seen.size !== 21) {
    throw new Error(`Plan deckt nur ${seen.size} von 21 Slots ab.`);
  }

  const totalIndexCount =
    knownMainRecipes.length + result.data.newRecipes.length;
  for (const a of result.data.assignments) {
    if (a.recipeIndex >= totalIndexCount) {
      throw new Error(
        `Ungültiger recipeIndex ${a.recipeIndex} (${totalIndexCount} Rezepte total).`,
      );
    }
  }

  return result.data;
}

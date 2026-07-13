import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";
import { RecipeDraftSchema } from "./generateRecipe";
import { getLatestMeasurement } from "../measurements";
import { compositionSummaryForPrompt } from "../bodyComp";

export const PlanAssignmentSchema = z.object({
  day: z.number().int().min(0).max(6),
  slot: z.enum(["breakfast", "lunch", "dinner"]),
  recipeIndex: z.number().int().min(0).max(15),
});

export const PlanDraftSchema = z.object({
  newRecipes: z.array(RecipeDraftSchema).min(1).max(6),
  assignments: z.array(PlanAssignmentSchema).min(3).max(21),
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
Abnehm-App. Du planst Mahlzeiten für einen vom Nutzer gewählten Tagesbereich (meist eine
volle Woche Mo–So mit 21 Slots, manchmal nur ein Teilbereich, z.B. Di–Sa). 3 Mahlzeiten
pro Tag (Frühstück + Mittag + Abend). Die genaue Anzahl Slots steht im User-Input.

Rhythmus und Struktur:
- Der Nutzer kocht die Hauptmahlzeiten (Mittag + Abend) in 3 Batches an Mo / Mi / Fr.
- Pro Hauptmahl-Batch: 1 Rezept mit 4–5 Portionen, das die 14 Mittag/Abend-Slots der Woche
  abdeckt. Typische Verteilung: Batch 1 (Mo gekocht) Mo–Di, Batch 2 (Mi gekocht) Mi–Do,
  Batch 3 (Fr gekocht) Fr–So. Haltbarkeit beachten.
- HAUPTMAHL-REZEPT-ROTATION: Wenn in "knownMainRecipes" Einträge stehen, sind das bereits
  vom Nutzer gekochte und bekannte Rezepte. Nutze diese als 2 der 3 Hauptmahl-Batches und
  generiere nur 1 NEUES Hauptmahl-Rezept. Das Ziel: jede Woche 1 neues Rezept + 2 bekannte.
  Wenn knownMainRecipes LEER ist (erste Woche), generiere alle 3 Hauptmahl-Rezepte neu.
- FRÜHSTÜCK ist separat und bewusst simpel (Overnight Oats, Quark-Bowl, Rührei mit
  Haferflocken, Skyr-Bowl, Grießbrei, Shakshuka-Style ohne Paprika etc.). 5–10 Min. aktive
  Zeit. Portionen = 1 (wird frisch zubereitet). ABWECHSLUNG: Wie viele VERSCHIEDENE
  Frühstücks-Rezepte du erstellst, steht im User-Input ("Frühstücks-Abwechslung"). Erstelle
  genau so viele und verteile sie abwechselnd über die Frühstücks-Slots (nicht jeden Tag
  dasselbe — z. B. bei 2 Rezepten tageweise im Wechsel, bei 3 Rezepten reihum). Die Frühstücke
  sollen sich klar unterscheiden (anderes Hauptgetreide/Eiweiß/Geschmack, süß vs. herzhaft).

Reihenfolge in "newRecipes":
- Zuerst die neuen Hauptmahl-Rezepte, dann die Frühstücks-Rezepte.
- Die knownMainRecipes erscheinen NICHT in "newRecipes" — sie sind bereits in der DB.

BUDGET — SEHR WICHTIG:
- Günstige Grundzutaten bevorzugen: Linsen, Kichererbsen, Bohnen, Eier, Haferflocken, Reis,
  Bulgur, Kartoffeln, Hähnchenschenkel, Thunfisch/Sardinen aus der Dose, Quark, Hüttenkäse,
  saisonales Gemüse (Kohl, Karotten, Zwiebeln, Zucchini).
- Teure Zutaten meiden: Lachs, Rindfleisch, Garnelen, Feta sparsam, Pinienkerne, Avocado,
  Halloumi.
- Eine Portion < 3 € (Supermarktpreise DE).

FLEISCH-GRENZEN (DGE-Richtwerte 2024, VERBINDLICH — gelten für die GANZE geplante Woche über
alle Mahlzeiten zusammen):
- Max. 300 g Fleisch + Wurst pro Woche INSGESAMT (Geflügel, Rind, Schwein, Lamm plus jede
  Wurst/Schinken/Speck), also ~43 g pro geplantem Tag. Das konkrete Gramm-Limit für den
  aktuellen Tagesbereich steht im User-Input ("Fleisch-Budget") — halte es strikt ein.
- Weißes Fleisch (Geflügel: Huhn, Pute) klar bevorzugen. Rotes Fleisch (Rind, Schwein, Lamm)
  stark reduzieren. Verarbeitetes Fleisch/Wurst (Salami, Schinken, Speck, Würstchen) am
  stärksten minimieren (höchstens ~30 g/Woche) — es ist gesundheitlich am problematischsten.
- Fisch 1–2 Portionen pro Woche einplanen (zählt NICHT zu den 300 g Fleisch), bevorzugt
  günstig: Thunfisch/Sardinen/Makrele aus der Dose.
- Praktische Umsetzung beim Batch-Kochen: HÖCHSTENS EIN Hauptmahl-Batch der Woche darf auf
  rotem Fleisch aufbauen; die übrigen Batches pflanzlich (Hülsenfrüchte, Eier, Tofu) oder mit
  Geflügel bzw. Fisch. So bleibt die 300-g-Grenze automatisch eingehalten.

Vorgaben für JEDES neue Rezept:
- MENGEN AUSSCHLIESSLICH IN EXAKTEN STANDARDEINHEITEN: g (Gramm) und ml (Milliliter) für
  Gewicht/Flüssigkeit, Stück für Zählbares (Eier, Zwiebeln, Zitronen). Für kleine Mengen
  (Gewürze, Öl, Säure) sind EL und TL erlaubt. KEINE ungefähren Haushaltsmaße — NICHT
  Handvoll, Glas, Becher, Schale, Tasse, Packung, faustgroß, tennisballgroß, mittel o. Ä.
  Jede Zutat bekommt eine konkrete Zahl + Einheit (z. B. 200 g rote Linsen, 400 ml
  Gemüsebrühe, 2 Stück Eier, 1 EL Olivenöl).
- Anfängerfreundliche Schritte mit optischen Garchecks (keine Kerntemperaturen).
- Eiweißreich: Hauptmahlzeiten ≥ 35 g pro Portion. Frühstück ≥ 25 g pro Portion.
- Techniken als deutsche Tags (max 5).
- KEINE Notizen erzeugen: Lass das Feld "notes" bei jedem Rezept komplett weg und gib
  auch KEIN "weekNotes" aus.
- MENGEN IN DEN SCHRITTEN WIEDERHOLEN: Jeder Zubereitungsschritt nennt die konkreten Mengen
  inline ("die 2 gehackten Zwiebeln und 4 gepressten Knoblauchzehen anbraten"), inkl. Salz, Fett,
  Säure ("1 TL grobes Meersalz", "Saft einer halben Zitrone", "1 EL Olivenöl"). Aus den Schritten
  allein kochbar.

SALT-FAT-ACID-HEAT (SFAH) — Pflicht bei jedem neuen Rezept (Samin-Nosrat-Framework):
- KLARE CUISINE-RICHTUNG; Fett + Säure + Aromaten müssen zueinander passen:
  • mediterran/levantinisch: Olivenöl + Zitrone/Rotweinessig + Knoblauch/Petersilie/Kreuzkümmel/
    Sumach/Tahini.
  • französisch: Butter + Weißwein/Dijon + Schalotte/Thymian.
  • italienisch: Olivenöl/Butter + Rotweinessig/Tomate + Knoblauch/Basilikum/Oregano.
  • ostasiatisch: neutrales Öl + Reisessig/Sojasauce + Ingwer/Knoblauch/Frühlingszwiebel,
    geröstetes Sesamöl zum Finishen.
  • südostasiatisch: neutrales Öl/Kokosmilch + Limette/Fischsauce + Knoblauch/Chili/Koriander.
  • mexikanisch: neutrales Öl/Schweineschmalz + Limette + Kreuzkümmel/Chili/Koriandergrün.
  • indisch: Ghee/Butterschmalz + Joghurt/Tamarinde + Ingwer/Knoblauch/Garam Masala.
  Keine widersprüchlichen Welten mischen (z. B. nicht Parmesan und Fischsauce gleichzeitig).
- SALZ IN SCHICHTEN: Proteine 15–60 Min vorab salzen; Koch-/Pastawasser salzen (~1–2%);
  Gemüse beim Anbraten salzen; am Ende abschmecken. Standard: grobes Meersalz, Mengen konkret
  in den Schritten ("1 TL grobes Meersalz"). Letzter Schritt enthält "abschmecken und ggf.
  nachsalzen".
- SÄURE bewusst dosieren: tiefe Säure (Tomate/Wein/Essig im Ansatz) früh; Brightness-Säure
  (Zitrone, Essig-Splash) AM ENDE vom Herd genommen. Fast jedes Hauptgericht endet mit einem
  Säure-Touch passend zur Cuisine.
- HITZE bewusst wählen: trockene Hitze (heiße Pfanne, 200–230°C Ofen) fürs Bräunen — Oberfläche
  trocken tupfen, Pfanne nicht überfüllen (sonst Dampf statt Kruste). Nasse Hitze (Schmoren,
  Köcheln) für Zartheit. Schritte mit Pfannen-Signalen statt nur Minuten ("kräftiges Zischen",
  "tief goldbraun", "löst sich von der Pfanne"). Fleisch 5–10 Min ruhen lassen.
- FETT macht Salz und Säure schmeckbar; ein finaler Akzent (Olivenöl-Drizzle, Joghurt-Klecks,
  geröstete Nüsse) hebt das Gericht.

Antworte AUSSCHLIESSLICH mit validem JSON (kein Markdown, keine Code-Fences).

FELDNAMEN SIND VERBINDLICH. Jedes RecipeDraft enthält EXAKT diese Schlüssel:
  title, cuisine, portions, kcalPerPortion, proteinG, carbG, fatG, batchStorageDays,
  ingredients, steps, techniques

RECIPE-INDEX-KODIERUNG in "assignments":
- Die knownMainRecipes werden zuerst indexiert: index 0, 1, ... (in der Reihenfolge aus dem
  Input).
- Danach folgen die "newRecipes" in der Reihenfolge deiner Antwort: index K, K+1, ...
  (wobei K = Anzahl knownMainRecipes).
- Beispiel: knownMainRecipes hat 2 Einträge, newRecipes hat 3 Einträge (1 neu-Hauptmahl +
  2 verschiedene Frühstücke). Dann sind die Indizes: 0 = known[0], 1 = known[1],
  2 = newRecipes[0] (neues Hauptmahl), 3 = newRecipes[1] (Frühstück A), 4 = newRecipes[2]
  (Frühstück B). Die Frühstücks-Slots der Woche wechseln dann zwischen Index 3 und 4.

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
      "ingredients": [{ "name": "Rote Linsen", "qty": 200, "unit": "g" }],
      "steps": ["..."],
      "techniques": ["..."]
    }
  ],
  "assignments": [
    { "day": 0, "slot": "breakfast", "recipeIndex": 3 },
    { "day": 0, "slot": "lunch", "recipeIndex": 0 },
    { "day": 0, "slot": "dinner", "recipeIndex": 0 }
    // ... insgesamt 21 Einträge
  ]
}

Pflicht:
- "assignments" hat EXAKT die im User-Input vorgegebene Anzahl Einträge — jede
  (day, slot)-Kombination im angegebenen Bereich genau einmal.
- day muss im im User-Input angegebenen Bereich liegen (0=Mo … 6=So).
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
  dayRange?: { start: number; end: number };
  useUpIngredients?: string[];
  claudeMemory?: string | null;
  /** false = ohne Budget-Einschränkung planen (Standard: true = günstig). */
  budgetConscious?: boolean;
};

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export async function generatePlanDraft({
  profile,
  recentMealTitles,
  knownMainRecipes,
  dayRange = { start: 0, end: 6 },
  useUpIngredients = [],
  claudeMemory,
  budgetConscious = true,
}: GeneratePlanArgs): Promise<PlanDraft> {
  const { start: startDay, end: endDay } = dayRange;
  const dayCount = endDay - startDay + 1;
  const expectedSlots = dayCount * 3;
  const isFullWeek = startDay === 0 && endDay === 6;

  // Frühstücks-Abwechslung: mehrere verschiedene Frühstücke über die Woche rotieren,
  // skaliert mit der Anzahl Tage (nie mehr Rezepte als Frühstücks-Slots).
  const breakfastVariety = Math.min(
    dayCount,
    dayCount >= 5 ? 3 : dayCount >= 3 ? 2 : 1,
  );

  const perMeal = {
    kcal: Math.round(profile.kcalTarget / 3),
    protein: Math.round(profile.proteinG / 3),
    carb: Math.round(profile.carbG / 3),
    fat: Math.round(profile.fatG / 3),
  };

  // Fleisch-Grenzen nach DGE-Richtwert 2024: max. 300 g Fleisch + Wurst pro Woche,
  // anteilig auf den geplanten Tagesbereich skaliert. Wurst/verarbeitet separat gedeckelt.
  // Fisch 1–2 Portionen/Woche (zählt nicht zu den 300 g).
  const MEAT_CAP_PER_WEEK_G = 300;
  const PROCESSED_CAP_PER_WEEK_G = 30;
  const meatCapG = Math.round((MEAT_CAP_PER_WEEK_G * dayCount) / 7);
  const processedCapG = Math.round((PROCESSED_CAP_PER_WEEK_G * dayCount) / 7);
  const fishPortions = dayCount >= 4 ? "1–2" : "1";

  const rangeBlock = isFullWeek
    ? `Tagesbereich: Mo–So (volle Woche, day 0..6, 21 Slots).`
    : `Tagesbereich: ${DAY_LABELS[startDay]}–${DAY_LABELS[endDay]} (day ${startDay}..${endDay}, ${dayCount} Tage, ${expectedSlots} Slots).
Wichtig: An den Tagen außerhalb dieses Bereichs wird NICHT gekocht/gegessen — generiere KEINE assignments für day < ${startDay} oder day > ${endDay}. Hauptmahl-Batches passend zur Tagezahl (Mo/Mi/Fr-Rhythmus nur soweit diese Tage im Bereich liegen, sonst am ersten Bereichstag starten und Haltbarkeit beachten).`;

  const mainBatchHint = isFullWeek
    ? `Volle Woche: 3 Hauptmahl-Batches (Mo/Mi/Fr).`
    : `Teilbereich: wähle so viele Hauptmahl-Batches, wie nötig, um die ${dayCount} Tage abzudecken (1 Batch ≈ 2 Tage Hauptmahlzeiten, Haltbarkeit beachten).`;

  const knownBlock = knownMainRecipes.length
    ? `knownMainRecipes (wiederverwendbar als Hauptmahl-Batches; Indizes 0..${knownMainRecipes.length - 1}):
${knownMainRecipes
  .map(
    (r, i) =>
      `  [${i}] "${r.title}" — ${r.cuisine}, ${r.portions} Portionen, ${r.kcalPerPortion} kcal, ${r.proteinG}E/${r.carbG}K/${r.fatG}F, hält ${r.batchStorageDays} Tage`,
  )
  .join("\n")}

${mainBatchHint} Nutze die bekannten Rezepte für so viele Hauptmahl-Batches wie sinnvoll und ergänze fehlende Hauptmahl-Batches durch neue Rezepte. Frühstück: separate neue Rezepte (Anzahl siehe "Frühstücks-Abwechslung").`
    : `knownMainRecipes ist leer.
${mainBatchHint} Generiere alle benötigten Hauptmahl-Rezepte neu + die Frühstücks-Rezepte (Anzahl siehe "Frühstücks-Abwechslung").`;

  const useUpBlock = useUpIngredients.length
    ? `Zutaten zum Aufbrauchen (priorisieren in NEUEN Rezepten, damit sie nicht schlecht werden — wenn möglich in mehreren Rezepten verteilt verwenden): ${useUpIngredients.map((i) => `"${i}"`).join(", ")}.`
    : "";

  const latestMeasurement = await getLatestMeasurement(profile.userId);
  const compositionBlock = latestMeasurement
    ? compositionSummaryForPrompt({
        waistCm: latestMeasurement.waistCm,
        hipCm: latestMeasurement.hipCm,
        bodyFatPct: latestMeasurement.bodyFatPct,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        sex: profile.sex as "male" | "female",
        age: profile.age,
      })
    : null;

  const memory = claudeMemory?.trim();
  const memoryBlock = memory
    ? `HARTE EINSCHRÄNKUNGEN & VORLIEBEN DES NUTZERS — NICHT VERHANDELBAR:
${memory}

Diese Vorgaben haben ABSOLUTEN VORRANG vor JEDER anderen Anweisung in diesem Prompt —
auch vor den Budget-Zutaten-Beispielen, der "Geflügel bevorzugen"-Regel im Fleisch-Abschnitt
und den Frühstücks-Beispielen aus dem System-Prompt (Rührei, Shakshuka etc.). Enthält die
Liste oben einen Ausschluss (z. B. "isst kein X" / "keine Y"), darf X/Y in KEINEM Rezept
dieser Antwort vorkommen — auch nicht als Nebenzutat, Garnitur, Ersatzvorschlag oder in
Spuren. Prüfe vor der Antwort JEDE Zutat JEDES Rezepts gegen diese Liste und ersetze
Verstöße durch eine passende Alternative, bevor du antwortest.
`
    : "";

  const budgetLine = budgetConscious
    ? "- Budget ist wichtig: günstige, alltagstaugliche Zutaten."
    : "- KEINE Budget-Einschränkung: Der Nutzer hat freie Zutatenwahl gewählt. IGNORIERE den BUDGET-Abschnitt aus dem System-Prompt vollständig — Kosten sind KEIN Auswahlkriterium. Wähle Zutaten nach Geschmack, Qualität und Nährwert (auch Lachs, Rind, Garnelen, Feta, Avocado, Nüsse sind erlaubt). Alle anderen Vorgaben (Fleisch-Grenzen, Vorlieben/Abneigungen, Eiweißziele) gelten UNVERÄNDERT weiter.";

  const userMsg = `Profil:
- Tagesziele: ${profile.kcalTarget} kcal · ${profile.proteinG} g E · ${profile.carbG} g K · ${profile.fatG} g F
- Pro Mahlzeit Zielwerte: ~${perMeal.kcal} kcal · ~${perMeal.protein} g E · ~${perMeal.carb} g K · ~${perMeal.fat} g F
- Ziel: ${profile.goal}
${budgetLine}
${compositionBlock ? `\n${compositionBlock}\n` : ""}
${memoryBlock ? `\n${memoryBlock}\n` : ""}
${rangeBlock}

Fleisch-Budget (DGE, VERBINDLICH für diesen Tagesbereich von ${dayCount} Tag(en)): max. ${meatCapG} g Fleisch + Wurst INSGESAMT über alle Mahlzeiten (davon höchstens ~${processedCapG} g verarbeitet/Wurst). Weißes Fleisch (Geflügel) vor rotem Fleisch bevorzugen, rotes Fleisch minimieren. Fisch: ${fishPortions} Portion(en) einplanen (zählt NICHT zum Fleisch-Budget). Übrige Hauptmahlzeiten pflanzlich (Hülsenfrüchte, Eier, Tofu).

Frühstücks-Abwechslung: Erstelle ${breakfastVariety} VERSCHIEDENE einfache Frühstücks-Rezepte und verteile sie abwechselnd über die ${dayCount} Frühstücks-Slots (day ${startDay}..${endDay}), damit nicht jeden Tag dasselbe Frühstück kommt. Die Rezepte sollen sich klar unterscheiden (anderes Hauptgetreide/Eiweiß, süß vs. herzhaft).

${knownBlock}
${useUpBlock ? `\n${useUpBlock}\n` : ""}
recentMeals (nicht für NEUE Rezepte verwenden): ${
    recentMealTitles.length
      ? recentMealTitles.map((t) => `"${t}"`).join(", ")
      : "keine"
  }

Erstelle die Planung (newRecipes + EXAKT ${expectedSlots} assignments für day ${startDay}..${endDay}).`;

  const msg = await callClaude({
    model: "planner",
    system: SYSTEM_PROMPT,
    // Läuft im Hintergrund (kein Nutzer wartet) — großzügig bemessen, damit ein
    // voller Wochenplan mit mehreren neuen Rezepten nicht mitten im JSON
    // abgeschnitten wird (das führt sonst zu "kein gültiges JSON").
    maxTokens: 16000,
    // Claude Sonnet 5 lehnt nicht-default temperature ab — effort statt dessen
    // als Dreh für Denktiefe/Tempo (medium: guter Kompromiss aus Tempo und
    // Qualität für die Wochenplanung).
    effort: "medium",
    messages: [{ role: "user", content: userMsg }],
  });

  if (msg.stop_reason === "max_tokens") {
    throw new Error(
      "Claudes Antwort wurde bei maxTokens abgeschnitten (Plan zu umfangreich) — bitte kürzeren Tagesbereich wählen oder erneut versuchen.",
    );
  }

  const text = stripCodeFences(extractText(msg));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const snippet = text.length > 400 ? `${text.slice(0, 200)} … ${text.slice(-200)}` : text;
    throw new Error(
      `Claude hat kein gültiges JSON geliefert (stop_reason: ${msg.stop_reason}). Antwortanfang/-ende: ${snippet}`,
    );
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
    if (a.day < startDay || a.day > endDay) {
      throw new Error(
        `Tag ${a.day} liegt außerhalb des Bereichs ${startDay}..${endDay}.`,
      );
    }
    const key = `${a.day}-${a.slot}`;
    if (seen.has(key)) throw new Error(`Doppelte Zuweisung für ${key}.`);
    seen.add(key);
  }
  if (seen.size !== expectedSlots) {
    throw new Error(
      `Plan deckt nur ${seen.size} von ${expectedSlots} Slots ab.`,
    );
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

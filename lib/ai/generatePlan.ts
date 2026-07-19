import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";
import { GenerationError } from "./generationError";
import { RecipeDraftSchema } from "./generateRecipe";
import { getLatestMeasurement } from "../measurements";
import { compositionSummaryForPrompt } from "../bodyComp";
import type { SnackPlan } from "../snacks";
import type { FishGroup } from "../fish";

export const PlanAssignmentSchema = z.object({
  day: z.number().int().min(0).max(6),
  slot: z.enum(["breakfast", "lunch", "dinner"]),
  recipeIndex: z.number().int().min(0).max(15),
});

export const PlanDraftSchema = z.object({
  newRecipes: z.array(RecipeDraftSchema).min(1).max(8),
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

/**
 * Prüft, ob die Tagessummen des Plans die Profil-Ziele treffen: Kalorien
 * ±15 %, Eiweiß mindestens 85 % des Ziels (Eiweiß-Überschuss ist ok).
 * Feste Snacks (snackMacrosByDay) zählen zur Tagessumme dazu — Claude plant
 * nur die 3 Mahlzeiten, die Snacks liegen bereits fest.
 * Liefert eine Problembeschreibung für den Korrektur-Prompt oder null.
 * Exportiert für Tests.
 */
export function validatePlanMacros(args: {
  draft: PlanDraft;
  knownMainRecipes: KnownRecipeSummary[];
  kcalTarget: number;
  proteinTarget: number;
  snackMacrosByDay?: Map<number, { kcal: number; protein: number }>;
}): string | null {
  const KCAL_TOLERANCE = 0.15;
  const PROTEIN_FLOOR = 0.85;

  // Gleiche Index-Kodierung wie in den assignments: erst known, dann neu.
  const all = [
    ...args.knownMainRecipes.map((r) => ({
      kcal: r.kcalPerPortion,
      protein: r.proteinG,
    })),
    ...args.draft.newRecipes.map((r) => ({
      kcal: r.kcalPerPortion,
      protein: r.proteinG,
    })),
  ];

  const byDay = new Map<number, { kcal: number; protein: number }>();
  for (const a of args.draft.assignments) {
    const r = all[a.recipeIndex];
    if (!r) continue; // ungültige Indizes meldet die Strukturprüfung
    const d = byDay.get(a.day) ?? { kcal: 0, protein: 0 };
    d.kcal += r.kcal;
    d.protein += r.protein;
    byDay.set(a.day, d);
  }
  for (const [day, d] of byDay) {
    const snack = args.snackMacrosByDay?.get(day);
    if (snack) {
      d.kcal += snack.kcal;
      d.protein += snack.protein;
    }
  }

  const problems: string[] = [];
  for (const [day, d] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const kcalDev = (d.kcal - args.kcalTarget) / args.kcalTarget;
    if (Math.abs(kcalDev) > KCAL_TOLERANCE) {
      problems.push(
        `Tag ${day}: ${d.kcal} kcal (Ziel ${args.kcalTarget}, Abweichung ${Math.round(kcalDev * 100)} %)`,
      );
    }
    if (d.protein < PROTEIN_FLOOR * args.proteinTarget) {
      problems.push(
        `Tag ${day}: nur ${d.protein} g Eiweiß (mindestens ${Math.round(PROTEIN_FLOOR * args.proteinTarget)} g nötig, Ziel ${args.proteinTarget} g)`,
      );
    }
  }
  return problems.length ? problems.join("; ") : null;
}

const SYSTEM_PROMPT = `Du bist ein persönlicher Koch-Coach und Wochenplaner für eine
Abnehm-App. Du planst Mahlzeiten für einen vom Nutzer gewählten Tagesbereich (meist eine
volle Woche Mo–So mit 21 Slots, manchmal nur ein Teilbereich, z.B. Di–Sa). 3 Mahlzeiten
pro Tag (Frühstück + Mittag + Abend). Die genaue Anzahl Slots steht im User-Input.
Zusätzlich hat der Nutzer ggf. FESTE SNACKS (z. B. Whey-Shake, Skyr-Bowl), die die App
bereits eingeplant hat — sie stehen im User-Input, du planst sie NICHT und ihre Makros
sind von den Tageszielen für deine 3 Mahlzeiten schon abgezogen. Dadurch müssen deine
Mahlzeiten KEINE extremen Eiweißmengen mehr tragen — nutze diese Freiheit für echte,
ausgewogene Gerichte statt Eiweiß-Stopferei.
Oberstes Ziel: Gerichte, die WIRKLICH schmecken — Nährwerte treffen ist Pflicht, aber
Geschmack entscheidet, ob der Plan durchgehalten wird.

PROTEIN-ARCHITEKTUR — Pflicht für jedes Hauptgericht (Denkweise eines Kochs, nicht
eines Makro-Rechners):
- ANKER ZUERST: Wähle zuerst den Protein-Anker des Gerichts (Hülsenfrüchte, Eier, Tofu/
  Tempeh, Seitan, Paneer, Geflügel, Fisch …) und baue das Gericht um ihn herum — NICHT
  erst ein Gericht wählen und dann Eiweiß danebenstellen.
- MINDESTENS 2 QUELLEN: Fehlendes Eiweiß aus einer zweiten, zum Gericht passenden Quelle
  holen (z. B. Dal + Ei obendrauf, Pasta aus Linsen statt Weizen, Ricotta in der Sauce)
  statt EINE Quelle auf absurde Mengen zu skalieren.
- MILCHPRODUKT-DECKEL: Quark, Skyr, Joghurt & Co. als Beilage/Dip (Raita, Tzatziki,
  Kräuterquark) maximal 150 g pro Portion. Ein Dip, der größer ist als das Gericht
  selbst, ist ein FEHLER — dann stattdessen den Anker vergrößern oder eine zweite
  Quelle einbauen. Als integrale Zutat (Sauce, Marinade) gelten übliche Rezeptmengen.
- REALISTISCHE PROPORTIONEN: Beilagen in echten Portionsgrößen (Reis/Bulgur/Couscous
  mindestens 50 g trocken) oder bewusst ganz weglassen — keine Alibi-Mengen wie 15 g
  Reis. Die Hauptkomponente bleibt mengenmäßig das Zentrum des Tellers.

VEGETARISCH: Steht im User-Input "Ernährung: VEGETARISCH", gilt zwingend: kein Fleisch,
kein Fisch, keine Gelatine, kein Fischsauce-/Speck-Aroma — auch nicht in Spuren. Der
Abschnitt FLEISCH-GRENZEN entfällt dann komplett, und Fleisch-/Fisch-Beispiele aus dem
BUDGET-Abschnitt (Hähnchenschenkel, Sardinen, Makrele) gelten nicht. Rotiere die Anker über die Woche:
Eier, Paneer/Halloumi, Tofu/Tempeh, Hülsenfrüchte, Linsen-/Kichererbsenpasta, Seitan.
Milchprodukte sind erlaubt, dürfen aber nicht der Hauptanker JEDER Mahlzeit sein.
Bevorzugt Küchen, die vegetarisches Eiweiß nativ können (indisch, levantinisch,
ostasiatisch, mexikanisch) — kein "Gericht X, nur ohne Fleisch".

KOCH-RHYTHMUS — DU empfiehlst ihn (der Nutzer macht KEIN Meal-Prep):
- Entscheide selbst, an welchen Tagen frisch gekocht wird und wo Reste vom Vortag
  eingeplant werden. Faustregeln: Frisch schmeckt am besten. Ein Hauptgericht darf bewusst
  mit mehr Portionen gekocht werden und den Folgetag mitversorgen — aber kein tagelanges
  Vorkochen (Reste maximal ~2 Tage nach dem Kochen essen, batchStorageDays beachten).
- Balanciere Aufwand und Abwechslung: nicht jeden Tag ein aufwendiges Gericht, aber auch
  nicht die halbe Woche dasselbe Essen. Typisch sinnvoll für eine volle Woche: 3–5
  verschiedene Hauptgerichte, jedes 1–2 Tage im Einsatz.
- "portions" jedes Rezepts = Anzahl der Slots, die es im Plan tatsächlich abdeckt.
- BEWÄHRTES WIEDERVERWENDEN: Wenn in "knownMainRecipes" Einträge stehen, sind das bereits
  gekochte und vom Nutzer GEMOCHTE Rezepte. Plane 1–2 davon als Hauptgerichte ein (bewährt
  = sicher lecker) und generiere die übrigen Hauptgerichte NEU für Abwechslung. Ist die
  Liste leer, generiere alle Hauptgerichte neu.
- FRÜHSTÜCK ist separat und bewusst simpel (Overnight Oats, Quark-Bowl, Rührei mit
  Haferflocken, Skyr-Bowl, Grießbrei etc.). 5–10 Min. aktive Zeit, wird frisch zubereitet;
  portions = Anzahl seiner Frühstücks-Slots. Entscheide selbst, wie viele VERSCHIEDENE
  Frühstücke sinnvoll sind (typisch 2–3 pro voller Woche, abwechselnd verteilt, nicht jeden
  Tag dasselbe). Die Frühstücke sollen sich klar unterscheiden (anderes Hauptgetreide/
  Eiweiß/Geschmack, süß vs. herzhaft).

ECHTE GERICHTE STATT ERFINDUNGEN — Pflicht für jedes neue Rezept:
- Real existierende, benannte Gerichte mit klarer Herkunft (z. B. Mujadara, Shakshuka,
  Dal Tadka, Chicken Cacciatore, Minestrone, Imam Bayildi) — KEINE frei erfundenen
  Zutaten-Mixe, keine "Fusion-Bowls". Klassiker haben Generationen von Selektionsdruck
  überlebt; sie schmecken bewiesenermaßen.
- Anpassungen für Makros/Budget sind erlaubt und erwünscht (mageres Protein, mehr Gemüse,
  weniger Öl), solange Charakter und Aromen-Basis des Gerichts erhalten bleiben. Der Titel
  nennt das Ursprungsgericht.

Reihenfolge in "newRecipes":
- Zuerst die neuen Hauptmahl-Rezepte, dann die Frühstücks-Rezepte.
- Die knownMainRecipes erscheinen NICHT in "newRecipes" — sie sind bereits in der DB.

BUDGET — SEHR WICHTIG:
- Günstige Grundzutaten bevorzugen: Linsen, Kichererbsen, Bohnen, Eier, Haferflocken, Reis,
  Bulgur, Kartoffeln, Hähnchenschenkel, Sardinen/Makrele aus der Dose, Quark, Hüttenkäse,
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
- Fisch 1–2 Portionen pro Woche einplanen (zählt NICHT zu den 300 g Fleisch). Es gibt
  zwei Fisch-Gruppen, die sich von Woche zu Woche ABWECHSELN (welche Gruppe diese Woche
  dran ist, steht im User-Input unter "Fisch-Rotation"):
  • Omega-3-Gruppe: Sardinen, Hering, Matjes, Makrele (gern aus der Dose — günstig und gut).
  • Weißfisch-Gruppe (Jod): Seelachs, Kabeljau, Schellfisch, Scholle.
  Thunfisch höchstens gelegentlich als Ausnahme (jodarm, quecksilberreicher) — nie als
  Standard-Fisch einplanen.
- Praktische Umsetzung: HÖCHSTENS EIN Hauptgericht der Woche darf auf rotem Fleisch
  aufbauen; die übrigen Hauptgerichte pflanzlich (Hülsenfrüchte, Eier, Tofu) oder mit
  Geflügel bzw. Fisch. So bleibt die 300-g-Grenze automatisch eingehalten.

Vorgaben für JEDES neue Rezept:
- MENGEN AUSSCHLIESSLICH IN EXAKTEN STANDARDEINHEITEN: g (Gramm) und ml (Milliliter) für
  Gewicht/Flüssigkeit, Stück für Zählbares (Eier, Zwiebeln, Zitronen). Für kleine Mengen
  (Gewürze, Öl, Säure) sind EL und TL erlaubt. KEINE ungefähren Haushaltsmaße — NICHT
  Handvoll, Glas, Becher, Schale, Tasse, Packung, faustgroß, tennisballgroß, mittel o. Ä.
  Jede Zutat bekommt eine konkrete Zahl + Einheit (z. B. 200 g rote Linsen, 400 ml
  Gemüsebrühe, 2 Stück Eier, 1 EL Olivenöl).
- Anfängerfreundliche Schritte mit optischen Garchecks (keine Kerntemperaturen).
- MAKRO-TREFFSICHERHEIT — WICHTIGSTE ZAHLENREGEL: Die Summe der 3 Mahlzeiten eines Tages
  muss die MAHLZEITEN-Tagesziele aus dem User-Input auf ±10 % treffen — an JEDEM Tag, vor
  allem bei Kalorien und Eiweiß. (Feste Snacks sind darin bereits herausgerechnet — nicht
  nochmal abziehen.) Orientiere dich an den "Pro Mahlzeit"-Zielwerten, NICHT an den
  Eiweiß-Mindestwerten (Mindestwerte sind Untergrenzen, KEINE Zielwerte — ein Plan, der
  nur die Minimums trifft, ist FALSCH). Rechne vor dem Antworten für jeden Tag nach:
  kcal-Summe und Eiweiß-Summe über die 3 Slots. Das Eiweiß dabei nach PROTEIN-ARCHITEKTUR
  erreichen (Anker + zweite Quelle), NIEMALS über überdimensionierte Milchprodukt-Beilagen.
- Eiweißreich: Die verbindlichen Eiweiß-Mindestwerte pro Mahlzeit stehen im User-Input
  ("Eiweiß-Minimum").
- Techniken als deutsche Tags (max 5).
- batchStorageDays = ehrliche Schätzung, wie viele Tage sich Reste im Kühlschrank halten.
- KEINE Rezept-Notizen erzeugen: Lass das Feld "notes" bei jedem Rezept komplett weg.
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
  /**
   * Bereits fest eingeplante Snacks (lib/snacks.ts). Ihre Makros werden von
   * den Tageszielen abgezogen, bevor Claude die 3 Mahlzeiten plant.
   */
  snackPlan?: SnackPlan;
  /**
   * Fisch-Gruppen des jüngsten fischhaltigen Vorwochen-Plans
   * (lib/fish.ts, getLastFishGroups) — steuert die Omega-3/Weißfisch-Rotation.
   */
  lastFishGroups?: FishGroup[];
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
  snackPlan,
  lastFishGroups = [],
}: GeneratePlanArgs): Promise<PlanDraft> {
  const { start: startDay, end: endDay } = dayRange;
  const dayCount = endDay - startDay + 1;
  const expectedSlots = dayCount * 3;
  const isFullWeek = startDay === 0 && endDay === 6;
  const vegetarian = profile.vegetarian;

  // Feste Snacks tragen einen Teil der Tagesziele — Claude plant die 3
  // Mahlzeiten nur noch auf die Restziele. Die Snack-Makros schwanken pro Tag
  // minimal (Rotation); für die Prompt-Zielwerte reicht der Durchschnitt, die
  // Validierung rechnet pro Tag exakt (validatePlanMacros).
  const snackDays = [...(snackPlan?.macrosByDay.values() ?? [])];
  const avgSnack = snackDays.length
    ? {
        kcal: Math.round(snackDays.reduce((s, d) => s + d.kcal, 0) / snackDays.length),
        protein: Math.round(snackDays.reduce((s, d) => s + d.protein, 0) / snackDays.length),
        carb: Math.round(snackDays.reduce((s, d) => s + d.carb, 0) / snackDays.length),
        fat: Math.round(snackDays.reduce((s, d) => s + d.fat, 0) / snackDays.length),
      }
    : { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const mealTargets = {
    kcal: profile.kcalTarget - avgSnack.kcal,
    protein: profile.proteinG - avgSnack.protein,
    carb: Math.max(0, profile.carbG - avgSnack.carb),
    fat: Math.max(0, profile.fatG - avgSnack.fat),
  };

  const perMeal = {
    kcal: Math.round(mealTargets.kcal / 3),
    protein: Math.round(mealTargets.protein / 3),
    carb: Math.round(mealTargets.carb / 3),
    fat: Math.round(mealTargets.fat / 3),
  };

  // Fleisch-Grenzen nach DGE-Richtwert 2024: max. 300 g Fleisch + Wurst pro Woche,
  // anteilig auf den geplanten Tagesbereich skaliert. Wurst/verarbeitet separat gedeckelt.
  // Fisch 1–2 Portionen/Woche (zählt nicht zu den 300 g).
  const MEAT_CAP_PER_WEEK_G = 300;
  const PROCESSED_CAP_PER_WEEK_G = 30;
  const meatCapG = Math.round((MEAT_CAP_PER_WEEK_G * dayCount) / 7);
  const processedCapG = Math.round((PROCESSED_CAP_PER_WEEK_G * dayCount) / 7);
  const fishPortions = dayCount >= 4 ? "1–2" : "1";

  // Omega-3/Weißfisch-Rotation: die zuletzt verwendete Gruppe bestimmt die
  // Vorgabe für diese Woche. Beide oder keine Gruppe gefunden → freie Wahl.
  let fishRotationLine: string;
  if (lastFishGroups.length === 1) {
    const [last] = lastFishGroups;
    fishRotationLine =
      last === "omega3"
        ? "Zuletzt war die Omega-3-Gruppe dran (Sardine/Hering/Makrele) → plane diese Woche die WEISSFISCH-Gruppe (Seelachs, Kabeljau, Schellfisch, Scholle)."
        : "Zuletzt war die Weißfisch-Gruppe dran (Seelachs/Kabeljau/Schellfisch) → plane diese Woche die OMEGA-3-Gruppe (Sardinen, Hering, Matjes, Makrele).";
  } else if (lastFishGroups.length > 1) {
    fishRotationLine =
      "Zuletzt kamen beide Fisch-Gruppen vor — freie Wahl der Gruppe diese Woche.";
  } else {
    fishRotationLine =
      "Keine Fisch-Historie vorhanden — freie Wahl, starte mit einer der beiden Gruppen.";
  }

  const rangeBlock = isFullWeek
    ? `Tagesbereich: Mo–So (volle Woche, day 0..6, 21 Slots).`
    : `Tagesbereich: ${DAY_LABELS[startDay]}–${DAY_LABELS[endDay]} (day ${startDay}..${endDay}, ${dayCount} Tage, ${expectedSlots} Slots).
Wichtig: An den Tagen außerhalb dieses Bereichs wird NICHT gekocht/gegessen — generiere KEINE assignments für day < ${startDay} oder day > ${endDay}. Empfiehl den Koch-Rhythmus passend zur Tagezahl.`;

  const knownBlock = knownMainRecipes.length
    ? `knownMainRecipes (bereits gekochte, GEMOCHTE Rezepte — 1–2 davon wieder einplanen; Indizes 0..${knownMainRecipes.length - 1}):
${knownMainRecipes
  .map(
    (r, i) =>
      `  [${i}] "${r.title}" — ${r.cuisine}, ${r.portions} Portionen, ${r.kcalPerPortion} kcal, ${r.proteinG}E/${r.carbG}K/${r.fatG}F, hält ${r.batchStorageDays} Tage`,
  )
  .join("\n")}

Ergänze die übrigen Hauptgerichte durch NEUE Rezepte und erstelle separate neue Frühstücks-Rezepte.`
    : `knownMainRecipes ist leer — generiere alle Hauptgerichte und Frühstücke neu.`;

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

  const snackTitles = [
    ...new Set(
      [...(snackPlan?.byDay.values() ?? [])].flat().map((p) => p.snack.title),
    ),
  ];
  const snackBlock = snackPlan && snackPlan.snacksPerDay > 0
    ? `Feste Snacks (von der App bereits eingeplant — du planst sie NICHT, sie erscheinen NICHT in "assignments"): ${snackPlan.snacksPerDay} pro Tag, zusammen Ø ${avgSnack.kcal} kcal · ${avgSnack.protein} g E pro Tag (${snackTitles.join(", ")}). Ihre Makros sind aus den Mahlzeiten-Zielen unten schon herausgerechnet.`
    : "";

  const userMsg = `Profil:
- Tagesziele GESAMT (inkl. Snacks): ${profile.kcalTarget} kcal · ${profile.proteinG} g E · ${profile.carbG} g K · ${profile.fatG} g F
${snackBlock ? `- ${snackBlock}\n` : ""}- Mahlzeiten-Tagesziele (Summe deiner 3 Mahlzeiten, ±10 %): ${mealTargets.kcal} kcal · ${mealTargets.protein} g E · ${mealTargets.carb} g K · ${mealTargets.fat} g F
- Pro Mahlzeit Zielwerte: ~${perMeal.kcal} kcal · ~${perMeal.protein} g E · ~${perMeal.carb} g K · ~${perMeal.fat} g F
- Eiweiß-Minimum pro Mahlzeit: Hauptmahlzeiten ≥ ${perMeal.protein} g, Frühstück ≥ ${Math.round(perMeal.protein * 0.7)} g (Untergrenzen — Zielwert bleibt ~${perMeal.protein} g pro Mahlzeit, Mahlzeiten-Tagessumme muss ±10 % von ${mealTargets.protein} g treffen)
- Ziel: ${profile.goal}
${vegetarian ? "- Ernährung: VEGETARISCH (kein Fleisch, kein Fisch — siehe VEGETARISCH-Abschnitt im System-Prompt)." : ""}
${budgetLine}
${compositionBlock ? `\n${compositionBlock}\n` : ""}
${memoryBlock ? `\n${memoryBlock}\n` : ""}
${rangeBlock}

${
    vegetarian
      ? `Ernährung: VEGETARISCH — ALLE Rezepte ohne Fleisch, Wurst und Fisch (auch ohne Fischsauce, Speck, Gelatine). Das Fleisch-Budget entfällt. Rotiere die Protein-Anker über die Tage (Eier, Paneer/Halloumi, Tofu/Tempeh, Hülsenfrüchte, Linsen-/Kichererbsenpasta, Seitan) — nicht jeden Tag derselbe Anker, und Milchprodukte nicht als Hauptanker jeder Mahlzeit.`
      : `Fleisch-Budget (DGE, VERBINDLICH für diesen Tagesbereich von ${dayCount} Tag(en)): max. ${meatCapG} g Fleisch + Wurst INSGESAMT über alle Mahlzeiten (davon höchstens ~${processedCapG} g verarbeitet/Wurst). Weißes Fleisch (Geflügel) vor rotem Fleisch bevorzugen, rotes Fleisch minimieren. Fisch: ${fishPortions} Portion(en) einplanen (zählt NICHT zum Fleisch-Budget). Fisch-Rotation: ${fishRotationLine} Übrige Hauptmahlzeiten pflanzlich (Hülsenfrüchte, Eier, Tofu).`
  }

${knownBlock}
${useUpBlock ? `\n${useUpBlock}\n` : ""}
recentMeals (nicht für NEUE Rezepte verwenden): ${
    recentMealTitles.length
      ? recentMealTitles.map((t) => `"${t}"`).join(", ")
      : "keine"
  }

Erstelle die Planung (newRecipes + EXAKT ${expectedSlots} assignments für day ${startDay}..${endDay}).`;

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userMsg },
  ];

  // Bis zu 2 Versuche: Verfehlt der Plan die Tagesziele (Kalorien/Eiweiß),
  // bekommt Claude die konkreten Abweichungen einmal zurückgespiegelt und
  // korrigiert. Strukturfehler (JSON, Slots) brechen dagegen sofort ab.
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; ; attempt++) {
    const msg = await callClaude({
      model: "planner",
      system: SYSTEM_PROMPT,
      // Läuft im Hintergrund (kein Nutzer wartet) — Modell-Maximum von Sonnet 5,
      // damit auch die Denk-Tokens (zählen mit ins maxTokens-Budget) einen vollen
      // Wochenplan nie mitten im JSON abschneiden. Kostet nur, was tatsächlich
      // generiert wird.
      maxTokens: 128000,
      // Claude Sonnet 5 lehnt nicht-default temperature ab — effort statt dessen
      // als Dreh für Denktiefe/Tempo (medium: guter Kompromiss aus Tempo und
      // Qualität für die Wochenplanung).
      effort: "medium",
      messages,
    });

    // Roh-Antwort (unbereinigt) für die Fehlerdiagnose an jeden Fehler hängen —
    // die Server-Action persistiert sie über lib/generationLog.ts.
    const rawText = extractText(msg);
    const fail = (message: string) =>
      new GenerationError(message, {
        rawResponse: rawText,
        stopReason: msg.stop_reason,
      });

    if (msg.stop_reason === "max_tokens") {
      throw fail(
        "Claudes Antwort wurde bei maxTokens abgeschnitten (Plan zu umfangreich) — bitte kürzeren Tagesbereich wählen oder erneut versuchen.",
      );
    }

    const text = stripCodeFences(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const snippet = text.length > 400 ? `${text.slice(0, 200)} … ${text.slice(-200)}` : text;
      throw fail(
        `Claude hat kein gültiges JSON geliefert (stop_reason: ${msg.stop_reason}). Antwortanfang/-ende: ${snippet}`,
      );
    }
    const result = PlanDraftSchema.safeParse(parsed);
    if (!result.success) {
      throw fail(
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
        throw fail(
          `Tag ${a.day} liegt außerhalb des Bereichs ${startDay}..${endDay}.`,
        );
      }
      const key = `${a.day}-${a.slot}`;
      if (seen.has(key)) throw fail(`Doppelte Zuweisung für ${key}.`);
      seen.add(key);
    }
    if (seen.size !== expectedSlots) {
      throw fail(
        `Plan deckt nur ${seen.size} von ${expectedSlots} Slots ab.`,
      );
    }

    const totalIndexCount =
      knownMainRecipes.length + result.data.newRecipes.length;
    for (const a of result.data.assignments) {
      if (a.recipeIndex >= totalIndexCount) {
        throw fail(
          `Ungültiger recipeIndex ${a.recipeIndex} (${totalIndexCount} Rezepte total).`,
        );
      }
    }

    const macroProblem = validatePlanMacros({
      draft: result.data,
      knownMainRecipes,
      kcalTarget: profile.kcalTarget,
      proteinTarget: profile.proteinG,
      snackMacrosByDay: snackPlan?.macrosByDay,
    });
    if (!macroProblem) return result.data;
    if (attempt >= MAX_ATTEMPTS) {
      throw fail(
        `Plan verfehlt die Tagesziele auch nach einem Korrekturversuch: ${macroProblem}`,
      );
    }
    messages.push(
      { role: "assistant", content: rawText },
      {
        role: "user",
        content: `Dein Plan verfehlt die Tagesziele (Tagessummen jeweils INKLUSIVE der festen Snacks gerechnet):
${macroProblem}

Erstelle den KOMPLETTEN Plan neu (gleiches JSON-Format, gleiche Slot- und Index-Vorgaben).
Deine 3 Mahlzeiten müssen pro Tag zusammen ${mealTargets.kcal} kcal ±10 % und mindestens ${Math.round(mealTargets.protein * 0.9)} g Eiweiß liefern. Fehlendes Eiweiß nach PROTEIN-ARCHITEKTUR beheben: Anker vergrößern oder eine zweite passende Quelle einbauen (${vegetarian ? "Eier, Paneer, Tofu, Hülsenfrüchte, Linsenpasta" : "Hülsenfrüchte, Eier, Geflügel, Fisch, Tofu"}) — NICHT einfach Milchprodukt-Beilagen vergrößern (Deckel: 150 g pro Portion). Rechne für jeden Tag nach, BEVOR du antwortest.`,
      },
    );
  }
}

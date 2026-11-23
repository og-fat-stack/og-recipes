import type { Ingredient } from "./recipe";

/**
 * Saisonkalender für frisches Obst und Gemüse aus Deutschland (Freiland bzw.
 * Lagerware, angelehnt an die Saisonkalender von BZfE und Verbraucherzentrale).
 * Der Wochenplan nimmt nur Rezepte, deren frisches Obst und Gemüse gerade
 * Saison hat. TK-Ware, Dosen, Gläser und Trockenware sind immer erlaubt.
 * Reine Funktionen, exportiert für Tests.
 */

type Produce = {
  name: string;
  kind: "gemuese" | "obst";
  /** Monate (1–12), in denen es Saison hat. */
  months: number[];
  /**
   * Erkennung im normalisierten Zutatennamen (klein, ä→ae …). Fehlt das
   * Muster, steht der Eintrag nur in der Saison-Liste für die Rezeptsuche.
   */
  pattern?: RegExp;
};

/** Monatsbereich, auch über den Jahreswechsel (z. B. 10 → 3). */
function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === to) return out;
  }
}
const ALL_YEAR = range(1, 12);

const PRODUCE: Produce[] = [
  // --- Gemüse ---------------------------------------------------------------
  { name: "Tomaten", kind: "gemuese", months: range(6, 10), pattern: /tomaten?\b/ },
  { name: "Paprika", kind: "gemuese", months: range(7, 10), pattern: /paprika(schoten?)?\b/ },
  { name: "Gurke", kind: "gemuese", months: range(5, 10), pattern: /gurken?\b/ },
  { name: "Zucchini", kind: "gemuese", months: range(6, 10), pattern: /zucchin[io]\b/ },
  { name: "Aubergine", kind: "gemuese", months: range(7, 10), pattern: /auberginen?\b/ },
  { name: "Spargel", kind: "gemuese", months: range(4, 6), pattern: /spargel/ },
  {
    name: "grüne Bohnen",
    kind: "gemuese",
    months: range(6, 10),
    pattern: /(gruene|busch|stangen|prinzess|brech|schnippel)\s*-?\s*bohnen/,
  },
  { name: "Zuckerschoten", kind: "gemuese", months: range(6, 8), pattern: /zuckerschoten|kaiserschoten/ },
  { name: "Maiskolben", kind: "gemuese", months: range(8, 10), pattern: /maiskolben/ },
  { name: "Radieschen", kind: "gemuese", months: range(4, 10), pattern: /radieschen/ },
  { name: "Kohlrabi", kind: "gemuese", months: range(5, 10), pattern: /kohlrabi/ },
  { name: "Blumenkohl", kind: "gemuese", months: range(6, 11), pattern: /blumenkohl/ },
  { name: "Brokkoli", kind: "gemuese", months: range(6, 10), pattern: /brokkoli|broccoli/ },
  { name: "Fenchel", kind: "gemuese", months: range(6, 11), pattern: /fenchel(knollen?)?\b/ },
  { name: "Mangold", kind: "gemuese", months: range(6, 10), pattern: /mangold/ },
  { name: "Spinat", kind: "gemuese", months: range(3, 11), pattern: /spinat(blaetter)?\b/ },
  { name: "Rucola", kind: "gemuese", months: range(5, 10), pattern: /rucola|rauke/ },
  {
    name: "Kopf- und Blattsalat",
    kind: "gemuese",
    months: range(5, 10),
    pattern: /kopfsalat|eisbergsalat|romanasalat|roemersalat|lollo|salatherz|pfluecksalat|eichblattsalat|batavia/,
  },
  { name: "Staudensellerie", kind: "gemuese", months: range(6, 10), pattern: /staudensellerie|stangensellerie|selleriestange/ },
  { name: "Frühlingszwiebeln", kind: "gemuese", months: range(4, 10), pattern: /fruehlingszwiebel|lauchzwiebel/ },
  { name: "Spitzkohl", kind: "gemuese", months: range(5, 11), pattern: /spitzkohl/ },
  {
    name: "Weißkohl, Rotkohl, Wirsing",
    kind: "gemuese",
    months: range(6, 3),
    pattern: /(weiss|rot|blau)(kohl|kraut)\b|wirsing/,
  },
  { name: "Kürbis", kind: "gemuese", months: range(8, 2), pattern: /kuerbis(fleisch|wuerfel)?\b|hokkaido|butternut/ },
  { name: "Feldsalat", kind: "gemuese", months: range(10, 3), pattern: /feldsalat/ },
  { name: "Rosenkohl", kind: "gemuese", months: range(9, 2), pattern: /rosenkohl/ },
  { name: "Grünkohl", kind: "gemuese", months: range(10, 2), pattern: /gruenkohl/ },
  { name: "Pastinaken", kind: "gemuese", months: range(9, 3), pattern: /pastinake/ },
  { name: "Schwarzwurzeln", kind: "gemuese", months: range(10, 3), pattern: /schwarzwurzel/ },
  { name: "Steckrüben", kind: "gemuese", months: range(9, 3), pattern: /steckruebe/ },
  { name: "Pfifferlinge", kind: "gemuese", months: range(7, 10), pattern: /pfifferling/ },
  { name: "Steinpilze", kind: "gemuese", months: range(8, 10), pattern: /steinpilz/ },
  { name: "Chicorée", kind: "gemuese", months: range(10, 4) },
  // Ganzjährig (frisch oder als Lagerware) — nur für die Saison-Liste.
  { name: "Möhren", kind: "gemuese", months: ALL_YEAR },
  { name: "Lauch", kind: "gemuese", months: ALL_YEAR },
  { name: "Zwiebeln", kind: "gemuese", months: ALL_YEAR },
  { name: "Kartoffeln", kind: "gemuese", months: ALL_YEAR },
  { name: "Rote Bete", kind: "gemuese", months: ALL_YEAR },
  { name: "Knollensellerie", kind: "gemuese", months: ALL_YEAR },
  { name: "Champignons", kind: "gemuese", months: ALL_YEAR },

  // --- Obst -----------------------------------------------------------------
  { name: "Erdbeeren", kind: "obst", months: range(5, 7), pattern: /erdbeere/ },
  { name: "Himbeeren", kind: "obst", months: range(6, 9), pattern: /himbeere/ },
  { name: "Heidelbeeren", kind: "obst", months: range(7, 9), pattern: /heidelbeere|blaubeere/ },
  { name: "Brombeeren", kind: "obst", months: range(7, 9), pattern: /brombeere/ },
  { name: "Johannisbeeren", kind: "obst", months: range(6, 8), pattern: /johannisbeere/ },
  { name: "Stachelbeeren", kind: "obst", months: range(6, 8), pattern: /stachelbeere/ },
  // Nur das alleinstehende Wort "Beeren" — die Sorten oben haben eigene Muster.
  { name: "Beeren", kind: "obst", months: range(6, 9), pattern: /(^|[^a-z])beeren(mischung|mix)?\b/ },
  { name: "Kirschen", kind: "obst", months: range(6, 8), pattern: /kirschen?\b/ },
  { name: "Aprikosen", kind: "obst", months: range(7, 8), pattern: /aprikose/ },
  { name: "Pfirsiche, Nektarinen", kind: "obst", months: range(7, 9), pattern: /pfirsich|nektarine/ },
  { name: "Pflaumen", kind: "obst", months: range(7, 10), pattern: /pflaume|zwetsch/ },
  { name: "Mirabellen", kind: "obst", months: range(8, 9), pattern: /mirabelle/ },
  { name: "Melone", kind: "obst", months: range(6, 9), pattern: /melonen?\b/ },
  { name: "Weintrauben", kind: "obst", months: range(8, 10), pattern: /weintrauben?\b|(^|[^a-z])trauben\b/ },
  { name: "Rhabarber", kind: "obst", months: range(4, 6), pattern: /rhabarber/ },
  { name: "Birnen", kind: "obst", months: range(8, 3), pattern: /birnen?\b/ },
  { name: "Quitten", kind: "obst", months: range(9, 11), pattern: /quitten?\b/ },
  { name: "Äpfel", kind: "obst", months: ALL_YEAR },
  { name: "Orangen, Mandarinen (Import)", kind: "obst", months: range(11, 3) },
];

/**
 * Verarbeitete Formen sind keine frische Ware und darum immer erlaubt
 * (TK-Spinat, Dosentomaten, Tomatenmark, getrocknete Pflaumen, Paprikapulver …).
 */
const PROCESSED =
  /\btk\b|tiefgek|tiefkuehl|gefror|\bdose|dosen|konserv|passiert|stueckig|gehackte tomaten|geschaelte tomaten|in stuecken|getrocknet|trocken|eingelegt|\bglas\b|pulver|edelsuess|rosenscharf|geraeuchert|gemahlen|\bmark\b|paste|saft|\bmus\b|pueree|sauce|sosse|ketchup|marmelade|konfituere|sirup|pizzatomaten|polpa|gewuerzgurk|essiggurk|cornichon|rahmspinat|chips|flocken/;

/** Mengen darunter (pro Portion) sind Deko oder Würze, keine Gemüsebeilage. */
const MIN_GRAMS_PER_PORTION = 25;
const SPICE_UNITS = /^(tl|el|prise|prisen|msp|messerspitze|zweig|zweige|blatt|spritzer|schuss)\.?$/i;

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

/** Monat (1–12) in Berlin. Für einen Wochenplan: der Donnerstag der Woche. */
export function berlinMonth(d: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", month: "numeric" }).format(d));
}

export function planMonth(weekStart: Date): number {
  return berlinMonth(new Date(weekStart.getTime() + 3.5 * 24 * 3600 * 1000));
}

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

/** Welches Obst/Gemüse eine Zutat frisch ist (oder null, wenn keins erkannt). */
export function produceOf(ingredientName: string): Produce | null {
  const n = normalizeName(ingredientName);
  if (PROCESSED.test(n)) return null;
  for (const p of PRODUCE) if (p.pattern?.test(n)) return p;
  return null;
}

/**
 * Frisches Obst und Gemüse eines Rezepts, das im Monat KEINE Saison hat.
 * Kleine Mengen (Deko, Würze) zählen nicht. Leeres Array = saisonal ok.
 */
export function outOfSeason(
  ingredients: Ingredient[],
  portions: number,
  month: number,
): string[] {
  const hits = new Set<string>();
  for (const ing of ingredients) {
    const p = produceOf(ing.name);
    if (!p || p.months.includes(month)) continue;
    if (ing.grams != null) {
      if (ing.grams / Math.max(1, portions) < MIN_GRAMS_PER_PORTION) continue;
    } else if (SPICE_UNITS.test((ing.unit ?? "").trim())) {
      continue;
    }
    hits.add(p.name);
  }
  return [...hits];
}

/** Saison-Übersicht für die Rezeptsuche (Prompt). */
export function seasonOverview(month: number): {
  vegetables: string[];
  fruits: string[];
  outOfSeason: string[];
} {
  const inSeason = PRODUCE.filter((p) => p.months.includes(month));
  return {
    vegetables: inSeason.filter((p) => p.kind === "gemuese").map((p) => p.name),
    fruits: inSeason.filter((p) => p.kind === "obst").map((p) => p.name),
    outOfSeason: PRODUCE.filter((p) => p.pattern && !p.months.includes(month)).map((p) => p.name),
  };
}

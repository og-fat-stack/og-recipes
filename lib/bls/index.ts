import rawFoods from "./foods.json";

/**
 * Bundeslebensmittelschlüssel (BLS 4.0) — deutsche Nährstoffdatenbank des
 * Max Rubner-Instituts, Open Data unter CC BY 4.0 (Namensnennung Pflicht, siehe
 * BLS_ATTRIBUTION). foods.json wird mit scripts/buildBls.py aus dem offiziellen
 * Excel-Download (https://blsdb.de/download) erzeugt.
 */
export const BLS_ATTRIBUTION =
  "Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 — CC BY 4.0";

export type BlsFood = {
  code: string;
  name: string;
  /** Nährwerte pro 100 g */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
};

type Row = [string, string, number, number, number, number, number];

type Indexed = BlsFood & { tokens: string[]; norm: string };

let index: Indexed[] | null = null;
let byCode: Map<string, BlsFood> | null = null;

/** Kleinschreibung, Umlaute/ß vereinheitlichen, nur Buchstaben/Ziffern. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length >= 2);
}

function load(): Indexed[] {
  if (!index) {
    index = (rawFoods as Row[]).map(([code, name, kcal, protein, carb, fat, fiber]) => ({
      code,
      name,
      kcal,
      protein,
      carb,
      fat,
      fiber,
      tokens: tokenize(name),
      norm: normalize(name),
    }));
    byCode = new Map(index.map((f) => [f.code, f]));
  }
  return index;
}

export function getBlsFood(code: string): BlsFood | undefined {
  load();
  return byCode!.get(code);
}

/** Zubereitungs-Wörter: ohne sie im Suchbegriff gewinnt der Rohzustand. */
const PREP_WORDS = [
  "gekocht",
  "gebraten",
  "gegart",
  "gedunstet",
  "gedampft",
  "gebacken",
  "gegrillt",
  "frittiert",
  "geschmort",
  "zubereitet",
  "getrocknet",
  "konserve",
  "tiefgefroren",
];

/**
 * Wie gut passt ein Suchbegriff-Token zu einem Namens-Token? Deutsche
 * Komposita ("hahnchenschenkel" ↔ "hahnchen" + "schenkel") zählen über
 * Teilstring-Treffer mit.
 */
function tokenScore(q: string, nameTokens: string[]): number {
  let best = 0;
  for (const t of nameTokens) {
    if (t === q) return 1;
    if (q.length >= 4 && t.startsWith(q)) best = Math.max(best, 0.85);
    else if (t.length >= 4 && q.startsWith(t)) best = Math.max(best, 0.7);
    else if (t.length >= 5 && q.includes(t)) best = Math.max(best, 0.6);
    else if (q.length >= 5 && t.includes(q)) best = Math.max(best, 0.6);
  }
  return best;
}

/**
 * Kandidatensuche für einen Zutaten-Suchbegriff (z. B. "Hähnchen Oberschenkel
 * ohne Haut roh"). Liefert die besten `limit` Lebensmittel — die endgültige
 * Auswahl trifft Claude (lib/ai/analyzeNutrition.ts).
 */
export function searchBls(query: string, limit = 8): BlsFood[] {
  const qTokens = tokenize(query).filter((t) => t.length >= 3);
  if (qTokens.length === 0) return [];
  const wantsPrep = qTokens.some((t) => PREP_WORDS.some((p) => t.startsWith(p)));

  const scored: { food: Indexed; score: number }[] = [];
  for (const food of load()) {
    let sum = 0;
    let hits = 0;
    for (const q of qTokens) {
      const s = tokenScore(q, food.tokens);
      if (s > 0) hits++;
      sum += s;
    }
    if (hits === 0) continue;
    // Abdeckung des Suchbegriffs zählt am meisten; das erste Token ist meist
    // das Hauptlebensmittel ("Linsen rot getrocknet") und wiegt doppelt.
    let score = sum / qTokens.length + 0.5 * tokenScore(qTokens[0], food.tokens);
    // Kurze, generische Namen vor langen Spezialprodukten bevorzugen.
    score -= Math.max(0, food.tokens.length - qTokens.length) * 0.03;
    if (!wantsPrep) {
      if (food.tokens.includes("roh")) score += 0.1;
      if (food.tokens.some((t) => PREP_WORDS.some((p) => t.startsWith(p))))
        score -= 0.1;
    }
    scored.push({ food, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ food }) => ({
    code: food.code,
    name: food.name,
    kcal: food.kcal,
    protein: food.protein,
    carb: food.carb,
    fat: food.fat,
    fiber: food.fiber,
  }));
}

/** Kandidaten aus mehreren Suchbegriffen zusammenführen (ohne Duplikate). */
export function searchBlsMany(queries: string[], limit = 10): BlsFood[] {
  const seen = new Set<string>();
  const out: BlsFood[] = [];
  const perQuery = queries.map((q) => searchBls(q, limit));
  // Reißverschluss: die Top-Treffer jedes Begriffs zuerst.
  for (let i = 0; i < limit && out.length < limit; i++) {
    for (const list of perQuery) {
      const f = list[i];
      if (f && !seen.has(f.code)) {
        seen.add(f.code);
        out.push(f);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

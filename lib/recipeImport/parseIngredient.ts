import type { Ingredient } from "../recipe";

/**
 * Zerlegt eine Zutatenzeile einer Rezeptseite ("500 g Spitzkohl",
 * "1 ½ EL Olivenöl", "2-3 Knoblauchzehen", "Salz") in Menge, Einheit und Name —
 * ohne Claude, damit Rezepte aus der Web-Suche wörtlich übernommen werden.
 * Reine Funktion, exportiert für Tests.
 */

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

// Längere Schreibweisen zuerst, damit "Esslöffel" nicht als "E" + Rest zerfällt.
const UNITS: [RegExp, string, number][] = [
  [/^kg\b/i, "g", 1000],
  [/^g\b|^gr\.?(?=\s)|^gramm\b/i, "g", 1],
  [/^l\b|^liter\b/i, "ml", 1000],
  [/^ml\b/i, "ml", 1],
  [/^cl\b/i, "ml", 10],
  [/^dl\b/i, "ml", 100],
  [/^(el|essl(ö|oe)ffel)\b\.?/i, "EL", 1],
  [/^(tl|teel(ö|oe)ffel)\b\.?/i, "TL", 1],
  [/^(msp|messerspitze)\b\.?/i, "Msp.", 1],
  [/^prisen?\b/i, "Prise", 1],
  [/^(stück|stk)\b\.?/i, "Stück", 1],
  [/^bund\b/i, "Bund", 1],
  [/^(dosen?|ds)\b\.?/i, "Dose", 1],
  [/^(packungen?|pck|pkg|päckchen|pack)\b\.?/i, "Packung", 1],
  [/^zehen?\b/i, "Zehe", 1],
  [/^scheiben?\b/i, "Scheibe", 1],
  [/^becher\b/i, "Becher", 1],
  [/^tassen?\b/i, "Tasse", 1],
  [/^handvoll\b/i, "Handvoll", 1],
  [/^gl(ä|a)s(er)?\b/i, "Glas", 1],
  [/^zweige?\b/i, "Zweig", 1],
  [/^(blatt|blätter)\b/i, "Blatt", 1],
];

function parseNumber(s: string): number | undefined {
  const t = s.trim().replace(",", ".");
  if (!t) return undefined;
  const mixed = t.match(/^(\d+(?:\.\d+)?)?\s*([½¼¾⅓⅔])$/);
  if (mixed) return (mixed[1] ? Number(mixed[1]) : 0) + FRACTIONS[mixed[2]];
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function parseIngredientLine(line: string): Ingredient {
  const text = line.replace(/\s+/g, " ").trim();
  // Menge: Zahl, Dezimalzahl, Bruch, Unicode-Bruch, Bereich ("2-3", "2 bis 3").
  // Bruch zuerst probieren, sonst schluckt die Ganzzahl-Variante die "1" von "1/2".
  const num = String.raw`(?:\d+\s*/\s*\d+|\d+(?:[.,]\d+)?\s*[½¼¾⅓⅔]?|[½¼¾⅓⅔])`;
  const m = text.match(new RegExp(String.raw`^(${num})(?:\s*(?:-|–|bis)\s*(${num}))?\s*(.*)$`, "i"));
  if (!m) return { name: text };

  const a = parseNumber(m[1]);
  const b = m[2] ? parseNumber(m[2]) : undefined;
  let qty = a != null && b != null ? (a + b) / 2 : a;
  let rest = m[3].trim();
  let unit: string | undefined;
  for (const [re, u, factor] of UNITS) {
    const um = rest.match(re);
    if (um) {
      unit = u;
      if (qty != null) qty *= factor;
      rest = rest.slice(um[0].length).trim();
      break;
    }
  }
  const name = rest.replace(/^(\.|,)\s*/, "") || text;
  if (qty != null) qty = Math.round(qty * 100) / 100;
  return { name, ...(qty != null ? { qty } : {}), ...(unit ? { unit } : {}) };
}

/** Portionenzahl aus recipeYield ("4 Personen", "2 Portionen", "12 Stück"). */
export function parseYield(y: string | undefined, fallback = 2): number {
  const n = Number(y?.match(/\d+/)?.[0]);
  return Number.isFinite(n) && n >= 1 && n <= 30 ? n : fallback;
}

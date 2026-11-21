import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import { getBlsFood, searchBlsMany, type BlsFood } from "../bls";
import type { Ingredient } from "../recipe";
import { GenerationError } from "./generationError";

/**
 * Nährwerte eines Rezepts aus dem Bundeslebensmittelschlüssel (BLS 4.0)
 * nachrechnen, statt Claudes Pauschalschätzung zu übernehmen:
 *
 *   1. Claude schätzt pro Zutat das Rohgewicht in Gramm (die App arbeitet ohne
 *      Waage, Mengen stehen in Tassen/EL/Stück) und nennt BLS-taugliche
 *      Suchbegriffe.
 *   2. Die App sucht dazu Kandidaten im BLS (lib/bls).
 *   3. Claude wählt pro Zutat den passenden BLS-Eintrag. Passt keiner, liefert
 *      es eine eigene Schätzung pro 100 g — dieser Anteil wird als
 *      "nicht aus BLS" ausgewiesen (coverage).
 *   4. Die App rechnet Gramm × Nährwert / 100 und teilt durch die Portionen.
 *
 * Alle Rezepte eines Aufrufs (z. B. die neuen Rezepte eines Wochenplans)
 * laufen gebündelt in genau zwei Claude-Aufrufen.
 */

export type NutritionRecipeInput = {
  title: string;
  portions: number;
  ingredients: Ingredient[];
};

export type Macros = { kcal: number; protein: number; carb: number; fat: number };

export type NutritionResult = {
  perPortion: Macros;
  /** Anteil der Kalorien, der aus BLS-Daten stammt (0–1). */
  coverage: number;
  /** Zutaten, ergänzt um `grams` und (falls zugeordnet) `bls`-Code. */
  ingredients: Ingredient[];
};

/** Unterhalb dieses BLS-Anteils gilt die Rechnung als zu unsicher. */
export const MIN_COVERAGE = 0.6;

const EstimateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      grams: z.number().min(0).max(20000),
      terms: z.array(z.string().min(2)).max(3),
    }),
  ),
});

const Per100Schema = z.object({
  kcal: z.number().min(0).max(950),
  protein: z.number().min(0).max(100),
  carb: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
});

const MatchSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      code: z.string().nullable(),
      per100: Per100Schema.optional(),
    }),
  ),
});

const ESTIMATE_PROMPT = `Du bist Ernährungswissenschaftler und bereitest Rezeptzutaten für eine
Nährwertberechnung mit dem Bundeslebensmittelschlüssel (BLS 4.0) vor.

Für JEDE Zutat (id) lieferst du:
- "grams": das Gesamtgewicht dieser Zutat im GANZEN Rezept (alle Portionen zusammen), in Gramm,
  als essbarer Anteil im ROHZUSTAND bzw. so wie gekauft (ohne Knochen, Schale, Kerne; Reis,
  Nudeln, Linsen, Bulgur TROCKEN; Konserven abgetropft, wenn so verwendet). Rechne die
  Haushaltsmaße ehrlich um: 1 Tasse ≈ 200 ml (z. B. Reis trocken ≈ 170 g, Mehl ≈ 110 g,
  Haferflocken ≈ 80 g), 1 EL Öl ≈ 10 g, 1 EL Joghurt/Quark ≈ 20 g, 1 TL Gewürz ≈ 2–3 g,
  1 Becher Joghurt = 500 g, 1 Handvoll Blattgemüse ≈ 30 g, 1 Knoblauchzehe ≈ 4 g,
  1 mittlere Zwiebel ≈ 100 g, 1 Ei ≈ 55 g (ohne Schale), 1 Zitrone Saft ≈ 40 g.
  Gramm-Angaben im Zutatennamen haben Vorrang. Lies sie genau: "(insgesamt 600 g)" oder
  "(600 g)" = Gesamtmenge der Zeile, NICHT mal qty nehmen; "(Becher à 500 g)",
  "(1 Schale ≈ 250 g)", "pro Stück" = Gewicht EINER Einheit, also mal qty. Salz, Pfeffer, Wasser und
  "nach Geschmack" ohne Menge → 0 (oder die real übliche Kleinstmenge in Gramm).
- "terms": 1–3 kurze deutsche Suchbegriffe im BLS-Stil — generisch, Singular, Grundlebensmittel
  zuerst, Zustand am Ende. Beispiele: "Hähnchen Oberschenkel ohne Haut roh",
  "Reis poliert roh", "Linse rot reif", "Kichererbse Konserve abgetropft",
  "Tomate geschält Konserve", "Teigwaren eifrei roh", "Sahnejoghurt 10 % Fett" (für
  griechischen Joghurt), "Speisequark Magerstufe", "Speisezwiebel roh", "Olivenöl",
  "Feta", "Hühnerei roh". Bei Markennamen das Grundlebensmittel nennen.

Antworte AUSSCHLIESSLICH mit JSON (kein Markdown):
{"items":[{"id":"r0i0","grams":180,"terms":["Hähnchen Oberschenkel ohne Haut roh","Hähnchen Fleisch ohne Haut roh"]}]}`;

const MATCH_PROMPT = `Du ordnest Rezeptzutaten Einträgen des Bundeslebensmittelschlüssels (BLS 4.0) zu.

Für JEDE Zutat (id) bekommst du Kandidaten mit BLS-Code und Nährwerten pro 100 g.
- Wähle den Kandidaten, der Lebensmittel UND Zustand am besten trifft ("code").
  Rohzutat → Roh-Eintrag (nicht "gekocht"/"gebraten", außer die Zutat wird gegart gekauft).
  Fertiggerichte/Eintöpfe nie für eine Einzelzutat wählen.
  Ein naher Verwandter mit sehr ähnlichen Nährwerten ist ok (z. B. "Reis poliert, roh" für
  Basmatireis, "Tomate roh" für Cherrytomaten, "Hähnchen Fleisch, ohne Haut, roh" für
  Hähnchenbrust ohne Haut).
- Passt KEIN Kandidat (anderes Lebensmittel oder deutlich andere Nährwerte): "code": null und
  "per100" mit deiner realistischen Schätzung pro 100 g (kcal, protein, carb = verfügbare
  Kohlenhydrate, fat).
- Zutaten mit 0 g: "code": null, "per100" mit Nullen.

Antworte AUSSCHLIESSLICH mit JSON (kein Markdown):
{"items":[{"id":"r0i0","code":"V4A5100"},{"id":"r0i1","code":null,"per100":{"kcal":350,"protein":12,"carb":70,"fat":2}}]}`;

export function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

async function askJson<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  label: string,
): Promise<T> {
  const msg = await callClaude({
    model: "smart",
    system,
    maxTokens: 32000,
    temperature: 0,
    messages: [{ role: "user", content: user }],
  });
  const rawText = extractText(msg);
  const fail = (m: string) =>
    new GenerationError(`Nährwertanalyse (${label}): ${m}`, {
      rawResponse: rawText,
      stopReason: msg.stop_reason,
    });
  if (msg.stop_reason === "max_tokens") throw fail("Antwort abgeschnitten.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch {
    throw fail("kein gültiges JSON.");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw fail(
      result.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }
  return result.data;
}

function describeIngredient(ing: Ingredient): string {
  const amount = [ing.qty, ing.unit].filter((x) => x != null && x !== "").join(" ");
  return amount ? `${ing.name} — ${amount}` : ing.name;
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/**
 * Rechnet aus Grammzahlen und Nährwerten pro 100 g die Makros pro Portion.
 * Reine Funktion, exportiert für Tests.
 */
export function computeMacros(
  portions: number,
  items: { grams: number; per100: Macros; fromBls: boolean }[],
): { perPortion: Macros; coverage: number } {
  const total: Macros = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  let blsKcal = 0;
  for (const it of items) {
    const f = it.grams / 100;
    total.kcal += it.per100.kcal * f;
    total.protein += it.per100.protein * f;
    total.carb += it.per100.carb * f;
    total.fat += it.per100.fat * f;
    if (it.fromBls) blsKcal += it.per100.kcal * f;
  }
  const p = Math.max(1, portions);
  return {
    perPortion: {
      kcal: Math.round(total.kcal / p),
      protein: Math.round(total.protein / p),
      carb: Math.round(total.carb / p),
      fat: Math.round(total.fat / p),
    },
    coverage: total.kcal > 0 ? blsKcal / total.kcal : 0,
  };
}

/**
 * Analysiert alle Rezepte gebündelt. Liefert pro Rezept ein Ergebnis oder
 * null, wenn die Rechnung unvollständig/unplausibel ist — dann behält der
 * Aufrufer die ursprünglichen Makros. Wirft bei API-/Parse-Fehlern
 * (GenerationError mit Roh-Antwort).
 */
export async function analyzeNutrition(
  recipes: NutritionRecipeInput[],
): Promise<(NutritionResult | null)[]> {
  const items = recipes.flatMap((r, ri) =>
    r.ingredients.map((ing, ii) => ({ id: `r${ri}i${ii}`, ri, ii, ing })),
  );
  if (items.length === 0) return recipes.map(() => null);

  // 1) Gramm + Suchbegriffe
  const estimateInput = recipes
    .map(
      (r, ri) =>
        `Rezept r${ri}: "${r.title}" (${r.portions} Portionen)\n` +
        r.ingredients
          .map((ing, ii) => `  r${ri}i${ii}: ${describeIngredient(ing)}`)
          .join("\n"),
    )
    .join("\n\n");
  const estimate = await askJson(ESTIMATE_PROMPT, estimateInput, EstimateSchema, "Gramm");
  const estById = new Map(estimate.items.map((e) => [e.id, e]));

  // 2) BLS-Kandidaten
  const candidates = new Map<string, BlsFood[]>();
  for (const it of items) {
    const est = estById.get(it.id);
    const terms = est?.terms.length ? est.terms : [it.ing.name];
    candidates.set(it.id, searchBlsMany(terms, 10));
  }

  // 3) Zuordnung
  const matchInput = items
    .map((it) => {
      const est = estById.get(it.id);
      const cands = candidates.get(it.id) ?? [];
      const list = cands.length
        ? cands
            .map(
              (c) =>
                `    ${c.code}: ${c.name} (${fmt(c.kcal)} kcal, ${fmt(c.protein)} E, ${fmt(c.carb)} K, ${fmt(c.fat)} F)`,
            )
            .join("\n")
        : "    (keine Kandidaten)";
      return `${it.id}: ${describeIngredient(it.ing)} — ${est ? `${est.grams} g` : "Gewicht unbekannt"}\n${list}`;
    })
    .join("\n\n");
  const match = await askJson(MATCH_PROMPT, matchInput, MatchSchema, "BLS-Zuordnung");
  const matchById = new Map(match.items.map((m) => [m.id, m]));

  // 4) Rechnen
  return recipes.map((r, ri) => {
    const rows: { grams: number; per100: Macros; fromBls: boolean }[] = [];
    const ingredients: Ingredient[] = [];
    for (let ii = 0; ii < r.ingredients.length; ii++) {
      const id = `r${ri}i${ii}`;
      const ing = r.ingredients[ii];
      const est = estById.get(id);
      const m = matchById.get(id);
      if (!est) return null; // Zutat ohne Gewicht → Rechnung unvollständig
      const grams = Math.round(est.grams);
      // Nur Codes akzeptieren, die wirklich unter den Kandidaten standen —
      // ein halluzinierter Code zählt nicht als BLS-Treffer.
      const offered = candidates.get(id)?.some((c) => c.code === m?.code);
      const food = m?.code && offered ? getBlsFood(m.code) : undefined;
      if (food) {
        rows.push({
          grams,
          per100: { kcal: food.kcal, protein: food.protein, carb: food.carb, fat: food.fat },
          fromBls: true,
        });
        ingredients.push({ ...ing, grams, bls: food.code });
      } else if (m?.per100 || grams === 0) {
        rows.push({
          grams,
          per100: m?.per100 ?? { kcal: 0, protein: 0, carb: 0, fat: 0 },
          fromBls: false,
        });
        const { bls: _drop, ...rest } = ing;
        void _drop;
        ingredients.push({ ...rest, grams });
      } else {
        return null; // weder BLS-Treffer noch Schätzung
      }
    }
    const { perPortion, coverage } = computeMacros(r.portions, rows);
    if (coverage < MIN_COVERAGE) return null;
    if (perPortion.kcal < 50 || perPortion.kcal > 3000) return null;
    return { perPortion, coverage, ingredients };
  });
}

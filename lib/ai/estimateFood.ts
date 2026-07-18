import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import { GenerationError } from "./generationError";

export const FoodItemSchema = z.object({
  name: z.string().min(1).max(120),
  /** Angenommene Menge als lesbarer Text ("250 g", "1 Stück", "1 EL"). */
  portion: z.string().min(1).max(60),
  kcal: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  carbG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(500),
});

export const FoodEstimateSchema = z.object({
  items: z.array(FoodItemSchema).min(1).max(20),
  /** Kurze Notiz, welche Mengen/Zubereitungen angenommen wurden (Deutsch). */
  assumptions: z.string().max(600).optional().nullable(),
});

export type FoodItem = z.infer<typeof FoodItemSchema>;
export type FoodEstimate = z.infer<typeof FoodEstimateSchema> & {
  totals: { kcal: number; proteinG: number; carbG: number; fatG: number };
};

const SYSTEM_PROMPT = `Du bist Ernährungsberater in einer privaten Abnehm-App. Der Nutzer
beschreibt in freiem Deutsch, was er gegessen hat (z. B. "2 Brötchen mit Butter und
Gouda, dazu ein Cappuccino"). Deine Aufgabe: die Nährwerte realistisch schätzen.

REGELN:
- Zerlege die Eingabe in einzelne Lebensmittel/Komponenten ("items"). Zusammengesetzte
  Gerichte (Döner, Lasagne, Linsensuppe) darfst du als EIN Item schätzen, wenn eine
  Zerlegung keine bessere Schätzung ergibt.
- MENGEN: Nutze die Angaben des Nutzers, wo vorhanden. Fehlen sie, nimm die in
  Deutschland übliche mittlere Portion an (Brötchen 60 g, Scheibe Käse 20 g, Scheibe
  Brot 45 g, EL Öl 10 g, Teller Suppe 400 ml, Döner ~350 g, Glas Saft 200 ml …).
  Schreibe die angenommene Menge in "portion".
- KEINE Rückfragen, keine Spannen — entscheide dich für den wahrscheinlichsten Wert.
  Bei echter Unsicherheit lieber leicht NACH OBEN schätzen (Restaurantessen, Öl,
  Saucen werden systematisch unterschätzt).
- Zubereitung mitdenken: gebraten = plus Bratfett, Salat = plus Dressing, wenn der
  Kontext es nahelegt — und in "assumptions" erwähnen.
- "assumptions": 1–2 kurze deutsche Sätze zu den wichtigsten Annahmen (Mengen,
  Zubereitung). Weglassen, wenn die Eingabe eindeutig war (exakte Grammangaben).
- Getränke ohne Kalorien (Wasser, schwarzer Kaffee, Light-Limo) ergeben ein Item mit
  0 kcal — so sieht der Nutzer, dass sie erfasst wurden.

Antworte AUSSCHLIESSLICH mit validem JSON (kein Markdown, keine Code-Fences):

{
  "items": [
    { "name": "Brötchen (Weizen)", "portion": "2 Stück (120 g)", "kcal": 330,
      "proteinG": 11, "carbG": 63, "fatG": 3 }
  ],
  "assumptions": "Normale Brötchengröße (60 g) und je 10 g Butter pro Brötchen angenommen."
}

Alle Zahlen sind Nährwerte für die GESAMTE angegebene Portion des Items (nicht pro
100 g). Zahlen dürfen Dezimalwerte sein.`;

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

/**
 * Schätzt kcal + Makros für eine Freitext-Essensbeschreibung. Die Summen
 * werden serverseitig aus den Items berechnet (nie von Claude übernommen),
 * damit Aufschlüsselung und Totale garantiert konsistent sind.
 */
export async function estimateFood(text: string): Promise<FoodEstimate> {
  const msg = await callClaude({
    // "smart" (Sonnet 4.6): Nutzer wartet auf die Antwort; niedrige Temperatur,
    // weil Schätzen ein Konsistenz-, kein Kreativitätsproblem ist.
    model: "smart",
    system: SYSTEM_PROMPT,
    maxTokens: 1500,
    temperature: 0.2,
    messages: [{ role: "user", content: `Gegessen: ${text}` }],
  });

  const rawText = extractText(msg);
  const fail = (message: string) =>
    new GenerationError(message, {
      rawResponse: rawText,
      stopReason: msg.stop_reason,
    });

  if (msg.stop_reason === "max_tokens") {
    throw fail(
      "Claudes Antwort wurde abgeschnitten — bitte die Eingabe kürzen oder aufteilen.",
    );
  }

  const cleaned = stripCodeFences(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const snippet =
      cleaned.length > 400
        ? `${cleaned.slice(0, 200)} … ${cleaned.slice(-200)}`
        : cleaned;
    throw fail(
      `Claude hat kein gültiges JSON geliefert (stop_reason: ${msg.stop_reason}). Antwortanfang/-ende: ${snippet}`,
    );
  }

  const result = FoodEstimateSchema.safeParse(parsed);
  if (!result.success) {
    throw fail(
      "Nährwert-Schätzung ungültig: " +
        result.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    );
  }

  const totals = result.data.items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      proteinG: acc.proteinG + i.proteinG,
      carbG: acc.carbG + i.carbG,
      fatG: acc.fatG + i.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
  );

  return {
    ...result.data,
    totals: {
      kcal: Math.round(totals.kcal),
      proteinG: Math.round(totals.proteinG),
      carbG: Math.round(totals.carbG),
      fatG: Math.round(totals.fatG),
    },
  };
}

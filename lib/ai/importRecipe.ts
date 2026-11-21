import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";
import type { ExtractedRecipe } from "../recipeImport/extract";
import { stripCodeFences } from "./analyzeNutrition";
import { RecipeDraftSchema } from "./recipeDraft";
import { GenerationError } from "./generationError";

export const ImportDraftSchema = RecipeDraftSchema.extend({
  /**
   * Zutaten, die gegen vegetarische Ernährung oder die harten Einschränkungen
   * des Nutzers verstoßen. Das Rezept selbst bleibt unverändert — die
   * Rezeptsuche verwirft solche Treffer, der Link-Import zeigt eine Warnung.
   */
  violations: z.array(z.string().min(3)).max(10).default([]),
});

export type ImportDraft = z.infer<typeof ImportDraftSchema>;

const SYSTEM_PROMPT = `Du überträgst ein bestehendes Rezept von einer Webseite in das Format einer
persönlichen Koch-App. Der Nutzer lebt in Deutschland und kocht frisch zu Hause.

Ist der Text gar kein Rezept (keine Zutatenliste erkennbar), antworte nur mit {"error": "kein Rezept"}.

TREUE ZUM ORIGINAL — Pflicht:
- Es bleibt GENAU dieses Gericht: gleiche Zutaten, gleiche Mengen, gleiche Zubereitung. Nichts
  "verbessern", keine Makro-Optimierung, keine zusätzlichen Zutaten, keine Portionsänderung.
- portions = Portionenzahl des Originals (recipeYield); fehlt sie, realistisch aus den Mengen
  schätzen.
- Ist das Original nicht auf Deutsch, übersetze alles ins Deutsche (Titel, Zutaten, Schritte).
  Den bekannten Gerichtsnamen beibehalten (z. B. "Shakshuka", "Chili con Carne").
- Du ersetzt NIE Zutaten, auch nicht wegen Einschränkungen. Verstößt eine Zutat gegen die HARTEN
  EINSCHRÄNKUNGEN des Nutzers (unten, falls vorhanden) oder gegen eine vegetarische Ernährung,
  übernimm sie trotzdem unverändert und nenne den Verstoß kurz in "violations"
  (z. B. "Speck — nicht vegetarisch"). Sonst ist "violations" leer.

MENGEN OHNE WAAGE — der Nutzer hat KEINE Küchenwaage:
- Rechne Gramm-/ml-Angaben in Haushaltsmaße um: Stück, Tassen (1 Tasse ≈ 200 ml), EL, TL,
  Handvoll (≈ 30 g Blattgemüse), Becher (Joghurtbecher = 500 g), Packung (Standardgrößen, z. B.
  Nudeln 500 g, Feta 200 g), Schale (Cherrytomaten 250 g), Dose (400 g), Glas, mittel, faustgroß,
  handtellergroß. Die Menge des Originals als Referenz in Klammern in den Zutatennamen
  schreiben, immer als GESAMTMENGE dieser Zeile mit "insgesamt", z. B.
  {"name": "Rinderhackfleisch (insgesamt 500 g)", "qty": 1, "unit": "Packung"},
  {"name": "stückige Tomaten (insgesamt 600 g)", "qty": 1.5, "unit": "Dose"}.
- Bruchteile sind ok ("qty": 0.5). "Salz, Pfeffer" ohne Menge ist ok.

SCHRITTE:
- Die Schritte des Originals in klaren, anfängerfreundlichen Sätzen; Reihenfolge und Technik
  beibehalten. Lange Schritte dürfen geteilt werden.
- MENGEN IN DEN SCHRITTEN WIEDERHOLEN ("die 2 gehackten Zwiebeln in 1 EL Olivenöl anbraten",
  NICHT "die Zwiebeln anbraten"), damit man allein aus den Schritten kochen kann.
- Wo das Original vage ist, optische Garchecks ergänzen ("bis die Zwiebeln glasig sind").

WEITERE FELDER:
- mealType: "breakfast" für Frühstücksgerichte (Porridge, Overnight Oats, Müsli-/Quark-Bowls,
  Rührei, Pfannkuchen zum Frühstück …), sonst "main".
- cuisine: kurze Küchenrichtung auf Deutsch (z. B. "Levantinisch", "Italienisch", "Deutsch").
- batchStorageDays: ehrliche Schätzung, wie viele Tage sich Reste im Kühlschrank halten (1–14).
- techniques: bis zu 5 kurze deutsche Technik-Tags ("scharf anbraten", "schmoren", …).
- kcalPerPortion, proteinG, carbG, fatG: deine ehrliche Schätzung pro Portion (wird danach mit
  einer Nährstoffdatenbank nachgerechnet). Nährwertangaben der Seite nur als grober Anhaltspunkt.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt (keine Erklärung, kein Markdown):
{
  "title": string,
  "cuisine": string,
  "mealType": "breakfast" | "main",
  "portions": integer (1-30),
  "kcalPerPortion": integer,
  "proteinG": integer,
  "carbG": integer,
  "fatG": integer,
  "batchStorageDays": integer (1-14),
  "ingredients": [{ "name": string, "qty"?: number, "unit"?: string }],
  "steps": [string],
  "techniques": [string],
  "violations": [string]
}`;

/** Eingefügter Rezepttext wird auf diese Länge gekürzt. */
export const MAX_PASTED_CHARS = 20_000;

export async function importRecipeDraft({
  recipe,
  profile,
  claudeMemory,
}: {
  /** schema.org-Daten der Seite oder vom Nutzer eingefügter Rezepttext. */
  recipe: ExtractedRecipe | string;
  profile: Profile | null;
  claudeMemory?: string | null;
}): Promise<ImportDraft> {
  const memory = claudeMemory?.trim();
  const constraints = [
    profile?.vegetarian
      ? "Ernährung: VEGETARISCH — kein Fleisch, keine Wurst, kein Fisch, keine Gelatine, keine Fischsauce."
      : "",
    memory ? `HARTE EINSCHRÄNKUNGEN & VORLIEBEN DES NUTZERS:\n${memory}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const original =
    typeof recipe === "string"
      ? `Originalrezept (vom Nutzer von einer Webseite kopierter Text — Werbung, Kommentare und
Navigationsreste ignorieren):\n${recipe.slice(0, MAX_PASTED_CHARS)}`
      : `Originalrezept (schema.org-Daten der Webseite):\n${JSON.stringify(recipe, null, 1)}`;
  const msg = await callClaude({
    model: "smart",
    system: SYSTEM_PROMPT,
    maxTokens: 32000,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: `${constraints ? `${constraints}\n\n` : ""}${original}`,
      },
    ],
  });

  const rawText = extractText(msg);
  const fail = (message: string) =>
    new GenerationError(message, { rawResponse: rawText, stopReason: msg.stop_reason });
  if (msg.stop_reason === "max_tokens") {
    throw fail("Claudes Antwort wurde abgeschnitten — bitte erneut versuchen.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch {
    throw fail("Claude hat kein gültiges JSON geliefert — bitte erneut versuchen.");
  }
  if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
    throw new GenerationError("Im eingefügten Text wurde kein Rezept erkannt.");
  }
  const result = ImportDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw fail(
      "Übertragenes Rezept ist ungültig: " +
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return result.data;
}

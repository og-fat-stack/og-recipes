import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Ingredient } from "../recipe";
import { stripCodeFences } from "./analyzeNutrition";
import { GenerationError } from "./generationError";

/**
 * Prüft Rezepte gegen vegetarische Ernährung und die harten Einschränkungen
 * des Nutzers (Claude-Memory), BEVOR der Wochenplan ausgewählt wird. Ein
 * eigener, kleiner Schritt — bei der Auswahl selbst übersieht Claude solche
 * Ausschlüsse zu leicht. Liefert die Indizes der Rezepte, die rausfliegen.
 */

const ResultSchema = z.object({
  violations: z.array(z.object({ index: z.number().int().min(0), reason: z.string() })),
});

const SYSTEM_PROMPT = `Du prüfst Rezepte gegen die Ernährungsvorgaben und harten Einschränkungen eines
Nutzers. Du änderst nichts, du meldest nur Verstöße.

Ein Rezept verstößt, wenn eine seiner Zutaten (auch Nebenzutat, Garnitur, Sauce) oder das
Gericht selbst unter einen Ausschluss fällt. AUSSCHLUSS ist alles, was der Nutzer nicht isst,
nicht mag, nicht verträgt, nicht bekommt oder nicht als Zutat will — auch wenn es als
"Abneigung" formuliert ist ("mag ich nicht" = Ausschluss). Nur positive Vorlieben ("mag gern",
"lieber …") sind KEINE Ausschlüsse.
Beispiele: "isst keine Pilze" → Champignons verstoßen; "Paprika mag ich nicht" → Paprikaschote
verstößt (Paprikapulver als Gewürz nur, wenn ausdrücklich genannt); "mag keine Overnight Oats" →
ein Overnight-Oats-Rezept verstößt; "vegetarisch" → Fleisch, Wurst, Fisch, Meeresfrüchte,
Gelatine, Fischsauce verstoßen.

Antworte NUR mit dem JSON, ohne Begründung davor oder danach:
{"violations":[{"index":3,"reason":"Paprikaschote"}]}
Keine Verstöße: {"violations":[]}`;

export async function findConstraintViolations(args: {
  recipes: { title: string; ingredients: Ingredient[] }[];
  vegetarian: boolean;
  claudeMemory?: string | null;
}): Promise<Map<number, string>> {
  const memory = args.claudeMemory?.trim();
  if (!args.vegetarian && !memory) return new Map();

  const user = `Vorgaben:
${args.vegetarian ? "- Ernährung: VEGETARISCH\n" : ""}${memory ? `- Harte Einschränkungen & Vorlieben:\n${memory}\n` : ""}
Rezepte:
${args.recipes
  .map((r, i) => `[${i}] ${r.title}: ${r.ingredients.map((ing) => ing.name).join(", ")}`)
  .join("\n")}`;

  const msg = await callClaude({
    model: "smart",
    system: SYSTEM_PROMPT,
    maxTokens: 8000,
    temperature: 0,
    messages: [{ role: "user", content: user }],
  });
  const rawText = extractText(msg);
  let parsed: unknown;
  try {
    // Robust gegen eine vorangestellte Begründung: das JSON-Objekt ab
    // '{"violations"' bis zur letzten schließenden Klammer nehmen.
    const text = stripCodeFences(rawText);
    const start = text.lastIndexOf('{"violations"');
    parsed = JSON.parse(start >= 0 ? text.slice(start, text.lastIndexOf("}") + 1) : text);
  } catch {
    throw new GenerationError("Einschränkungs-Prüfung: kein gültiges JSON.", {
      rawResponse: rawText,
      stopReason: msg.stop_reason,
    });
  }
  const result = ResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new GenerationError("Einschränkungs-Prüfung: ungültige Antwort.", {
      rawResponse: rawText,
      stopReason: msg.stop_reason,
    });
  }
  return new Map(result.data.violations.map((v) => [v.index, v.reason]));
}

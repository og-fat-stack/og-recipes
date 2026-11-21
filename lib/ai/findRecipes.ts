import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, MODELS } from "../anthropic";
import { GenerationError } from "./generationError";

/**
 * Sucht mit der Web-Suche der Claude-API nach ECHTEN, veröffentlichten
 * Rezepten. Claude liefert nur Links — Inhalt und Nährwerte holt die App
 * danach selbst von der Seite (lib/recipeImport) und rechnet sie mit dem BLS
 * nach. Claude erfindet hier nichts.
 */

export type SearchRequest = {
  /** Frei wählbare Kennung, kommt in der Antwort zurück. */
  id: string;
  mealType: "breakfast" | "main";
  /** Was gesucht wird, z. B. "Weißfisch-Gericht (Seelachs/Kabeljau)". */
  wish: string;
  /** Wie viele verschiedene Rezepte gebraucht werden. */
  count: number;
};

export type FindArgs = {
  requests: SearchRequest[];
  vegetarian: boolean;
  claudeMemory?: string | null;
  budgetConscious: boolean;
  /** Richtwerte pro Portion — die App passt die Portionsgröße an. */
  perMeal: { kcal: number; protein: number };
  /** Titel, die schon in der Sammlung oder kürzlich im Plan sind. */
  avoidTitles: string[];
};

// Seiten, die den automatischen Abruf blockieren oder keine Rezeptseiten sind.
const BLOCKED_DOMAINS = [
  "chefkoch.de",
  "pinterest.com",
  "pinterest.de",
  "youtube.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "reddit.com",
];

const ResultSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      urls: z.array(z.string().url()).max(12),
    }),
  ),
});

const SYSTEM_PROMPT = `Du suchst im Web nach ECHTEN, veröffentlichten Rezepten für eine private Koch-App
einer Familie in Deutschland. Du erfindest NIE selbst ein Rezept und gibst nur Links zurück, die du
in den Suchergebnissen tatsächlich gesehen hast.

So suchst du:
- Für jeden Suchauftrag (id) brauchst du "count" verschiedene Rezepte. Liefere pro Auftrag etwa
  DOPPELT so viele Kandidaten-Links (manche Seiten lassen sich nicht abrufen).
- Nur Links auf EINZELNE Rezeptseiten — keine Übersichten, Kategorien, Suchergebnisse, Videos.
- NUR deutschsprachige Rezeptseiten (z. B. eatsmarter.de, lecker.de, essen-und-trinken.de,
  kitchenstories.com, springlane.de, gutekueche.de, kuechengoetter.de, rewe.de/rezepte,
  edeka.de/rezepte, hellofresh.de/recipes, einfachkochen.de, oder gute Food-Blogs).
  chefkoch.de NICHT verwenden — die Seite blockiert den Abruf.
- Echte, bewährte Gerichte; keine Fantasie-Kombinationen.
- Die App passt die Portionsgröße an die Kalorien an. Entscheidend ist darum die EIWEISSDICHTE:
  bevorzuge Rezepte mit viel Eiweiß im Verhältnis zu den Kalorien (Richtwert siehe Auftrag).
- Kein Rezept doppelt, keine der Titel aus "Vermeiden".
- Halte dich strikt an Ernährung und harte Einschränkungen: Rezepte, die dagegen verstoßen,
  gar nicht erst vorschlagen (nicht "mit Abwandlung").

Antworte am Ende AUSSCHLIESSLICH mit JSON (kein Markdown, kein Text davor oder danach):
{"results":[{"id":"m1","urls":["https://…","https://…"]}]}`;

function lastJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("kein JSON");
  return JSON.parse(text.slice(start, end + 1));
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function findRecipeUrls(args: FindArgs): Promise<Map<string, string[]>> {
  const constraints = [
    args.vegetarian
      ? "Ernährung: VEGETARISCH — kein Fleisch, kein Fisch, keine Gelatine, keine Fischsauce."
      : "Ernährung: alles erlaubt.",
    args.budgetConscious
      ? "Budget: günstige Alltagszutaten bevorzugen (Hülsenfrüchte, Eier, Quark, Hähnchen, Saisongemüse)."
      : "Budget: keine Einschränkung.",
    args.claudeMemory?.trim()
      ? `HARTE EINSCHRÄNKUNGEN & VORLIEBEN (nicht verhandelbar):\n${args.claudeMemory.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ratio = Math.round((args.perMeal.protein / Math.max(1, args.perMeal.kcal)) * 1000) / 10;
  const requests = args.requests
    .map(
      (r) =>
        `- id "${r.id}" (${r.mealType === "breakfast" ? "Frühstück" : "Hauptgericht"}, ${r.count} Rezept(e)): ${r.wish}`,
    )
    .join("\n");

  const user = `${constraints}

Richtwert pro Mahlzeit: ~${args.perMeal.kcal} kcal und ~${args.perMeal.protein} g Eiweiß
(≈ ${ratio} g Eiweiß pro 100 kcal — je näher, desto besser).

Suchaufträge:
${requests}

Vermeiden (schon vorhanden): ${args.avoidTitles.length ? args.avoidTitles.map((t) => `"${t}"`).join(", ") : "—"}`;

  const totalCount = args.requests.reduce((n, r) => n + r.count, 0);
  const tools: Anthropic.ToolUnion[] = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: Math.min(10, 2 + args.requests.length + Math.ceil(totalCount / 2)),
      blocked_domains: BLOCKED_DOMAINS,
      user_location: { type: "approximate", country: "DE", timezone: "Europe/Berlin" },
    },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  let msg: Anthropic.Message | null = null;
  // Server-Tools laufen in einer Schleife auf Anthropics Seite; bei
  // "pause_turn" die bisherige Antwort zurückschicken, dann geht es weiter.
  for (let i = 0; i < 5; i++) {
    msg = await anthropic()
      .messages.stream({
        model: MODELS.smart,
        max_tokens: 32000,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools,
        messages,
      })
      .finalMessage();
    if (msg.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: msg.content });
  }
  if (!msg) throw new GenerationError("Rezeptsuche: keine Antwort.");

  const rawText = textOf(msg.content);
  const fail = (m: string) =>
    new GenerationError(`Rezeptsuche: ${m}`, { rawResponse: rawText, stopReason: msg.stop_reason });
  if (msg.stop_reason === "pause_turn") throw fail("Suche nicht fertig geworden.");
  if (msg.stop_reason === "max_tokens") throw fail("Antwort abgeschnitten.");

  let parsed: unknown;
  try {
    parsed = lastJsonObject(rawText);
  } catch {
    throw fail("kein gültiges JSON.");
  }
  const result = ResultSchema.safeParse(parsed);
  if (!result.success) {
    throw fail(result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }

  const out = new Map<string, string[]>();
  for (const r of result.data.results) {
    const urls = [...new Set(r.urls)].filter(
      (u) => !BLOCKED_DOMAINS.some((d) => new URL(u).hostname.endsWith(d)),
    );
    out.set(r.id, [...(out.get(r.id) ?? []), ...urls]);
  }
  return out;
}

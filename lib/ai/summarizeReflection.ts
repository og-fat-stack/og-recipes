import { z } from "zod";
import { callClaude, extractText } from "../anthropic";

export const ReflectionNotesSchema = z.object({
  summary: z.string().min(5).max(400),
  techniqueTakeaways: z.array(z.string().min(3).max(200)).max(5),
  nextTimeTry: z.array(z.string().min(3).max(200)).max(5),
});

export type ReflectionNotes = z.infer<typeof ReflectionNotesSchema>;

const SYSTEM_PROMPT = `Du bist ein freundlicher Koch-Coach. Du bekommst Feedback vom
Nutzer zu einem gerade gekochten Rezept (was gut lief, was nicht, Bewertung 1–5) und
fasst es strukturiert zusammen.

Antworte AUSSCHLIESSLICH mit JSON (kein Markdown, keine Code-Fences).

Schema:
{
  "summary": string (2–3 Sätze, positiv-konstruktiver Ton),
  "techniqueTakeaways": string[] (max 5; konkrete Lerninhalte zu Techniken),
  "nextTimeTry": string[] (max 5; konkrete Verbesserungsvorschläge fürs nächste Mal)
}

Richtlinien:
- Auf Deutsch, direkte Anrede ("du").
- Konkret und umsetzbar, keine Plattitüden.
- Wenn der Nutzer sehr kurz antwortet, extrapoliere vorsichtig aus Rezept-Kontext und Rating.`;

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export type SummarizeArgs = {
  recipeTitle: string;
  recipeTechniques: string[];
  wentWell: string;
  wentWrong: string;
  rating: number;
};

export async function summarizeReflection({
  recipeTitle,
  recipeTechniques,
  wentWell,
  wentWrong,
  rating,
}: SummarizeArgs): Promise<ReflectionNotes> {
  const userMsg = `Rezept: "${recipeTitle}"
Techniken: ${recipeTechniques.join(", ") || "(keine)"}
Bewertung: ${rating}/5

Was gut lief:
${wentWell || "(nichts angegeben)"}

Was nicht gut lief:
${wentWrong || "(nichts angegeben)"}`;

  const msg = await callClaude({
    model: "fast",
    system: SYSTEM_PROMPT,
    maxTokens: 800,
    temperature: 0.5,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = stripCodeFences(extractText(msg));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Claude hat kein gültiges JSON geliefert.");
  }
  const result = ReflectionNotesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Reflexion ungültig: " +
        result.error.issues.map((i) => i.message).join("; "),
    );
  }
  return result.data;
}

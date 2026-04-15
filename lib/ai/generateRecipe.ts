import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";

export const RecipeDraftSchema = z.object({
  title: z.string().min(2).max(120),
  cuisine: z.string().min(2).max(60),
  portions: z.number().int().min(1).max(30),
  kcalPerPortion: z.number().int().min(50).max(3000),
  proteinG: z.number().int().min(0).max(300),
  carbG: z.number().int().min(0).max(500),
  fatG: z.number().int().min(0).max(300),
  batchStorageDays: z.number().int().min(1).max(14),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().optional(),
        unit: z.string().optional(),
      }),
    )
    .min(2),
  steps: z.array(z.string().min(3)).min(2),
  techniques: z.array(z.string().min(2)).max(12),
  notes: z.string().max(4000).optional().nullable(),
});

export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;

const SYSTEM_PROMPT = `Du bist ein professioneller Rezeptentwickler für eine persönliche Koch-App.
Der Nutzer kocht 3× pro Woche in Batches, lebt in Deutschland und befindet sich auf einem
Kaloriendefizit zum Abnehmen. Fokus auf levantinische und mediterrane Küche mit Variation.

Wichtige Vorgaben für die Rezepte:
- DER NUTZER HAT KEINE KÜCHENWAAGE. Mengen ausschließlich in: Stück, Tassen (1 Tasse ≈ 200 ml),
  EL, TL, Handvoll (≈ 30 g Blattgemüse), Becher (Joghurtbecher = 500 g), Packung (Standardgrößen),
  Schale (Cherrytomaten 250 g, Feta 200 g), Glas, mittel, faustgroß, tennisballgroß, handtellergroß.
  Gramm-Werte nur als Referenz in Klammern angeben.
- Meal-Prep-freundlich: hält mindestens 3 Tage im Kühlschrank.
- Eiweißreich (mind. 30 g pro Portion, idealerweise 40+).
- Anfängerfreundliche Schritte mit optischen Garchecks (keine Kerntemperaturen, da kein Thermometer).
- Techniken sind kurze Tags auf Deutsch (z. B. "scharf anbraten", "karamellisieren", "emulgieren",
  "Gewürze anrösten", "Reispilaw"). Maximal 5 pro Rezept.
- In den Notizen: immer eine kurze "Maße ohne Waage"-Sektion mit Umrechnungen für die wichtigsten
  Zutaten dieses Rezepts.
- Makros müssen plausibel zu den Zutaten passen; rechne Portionen ehrlich aus.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt gemäß folgendem Schema (keine Erklärung,
kein Markdown, keine Code-Fences):

{
  "title": string,
  "cuisine": string,
  "portions": integer (1-30),
  "kcalPerPortion": integer,
  "proteinG": integer,
  "carbG": integer,
  "fatG": integer,
  "batchStorageDays": integer (1-14),
  "ingredients": [{ "name": string, "qty"?: number, "unit"?: string }],
  "steps": [string],
  "techniques": [string],
  "notes": string
}`;

export type GenerateArgs = {
  prompt: string;
  profile: Profile | null;
};

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export async function generateRecipeDraft({
  prompt,
  profile,
}: GenerateArgs): Promise<RecipeDraft> {
  const profileContext = profile
    ? `Nutzerprofil: Tagesziel ${profile.kcalTarget} kcal, ${profile.proteinG} g Eiweiß, ${profile.carbG} g KH, ${profile.fatG} g Fett. Ziel: ${profile.goal}. Plane jede Portion so, dass sie ca. 1/2 eines Tages-Makros deckt (er isst 2 Mahlzeiten pro Tag).`
    : `Nutzerprofil: nicht gesetzt. Plane eine eiweißreiche, moderat kalorische Portion (~500–650 kcal, 40+ g Eiweiß).`;

  const msg = await callClaude({
    model: "smart",
    system: SYSTEM_PROMPT,
    maxTokens: 3000,
    temperature: 0.8,
    messages: [
      {
        role: "user",
        content: `${profileContext}\n\nRezept-Wunsch: ${prompt}`,
      },
    ],
  });

  const text = stripCodeFences(extractText(msg));

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "Claude hat kein gültiges JSON geliefert. Bitte erneut versuchen.",
    );
  }

  const result = RecipeDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Generiertes Rezept ist ungültig: " +
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return result.data;
}

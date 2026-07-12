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
  batchStorageDays: z.number().int().min(0).max(14),
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
- MENGEN IN DEN SCHRITTEN WIEDERHOLEN: Jeder Zubereitungsschritt nennt die konkreten Mengen inline
  ("die 2 gehackten Zwiebeln und 4 gepressten Knoblauchzehen anbraten", NICHT "die Zwiebeln und
  den Knoblauch anbraten"). Auch Salz, Fett und Säure mit Menge ("1 TL grobes Meersalz",
  "Saft einer halben Zitrone", "1 EL Olivenöl"). Der Nutzer soll allein aus den Schritten kochen
  können, ohne zur Zutatenliste zu scrollen.

SALT-FAT-ACID-HEAT (SFAH) — Pflicht bei JEDEM Rezept (Samin-Nosrat-Framework):
- KLARE CUISINE-RICHTUNG. Fett + Säure + Aromaten müssen zur Richtung passen:
  • mediterran/levantinisch: Olivenöl + Zitrone/Rotweinessig + Knoblauch, Petersilie, Kreuzkümmel,
    Sumach, Tahini.
  • französisch: Butter/Sahne + Weißwein/Dijon + Schalotte, Thymian, Lorbeer.
  • italienisch: Olivenöl/Butter + Rotweinessig/Tomate/Zitrone + Knoblauch, Basilikum, Oregano,
    Anchovis.
  • spanisch: Olivenöl + Sherryessig + Knoblauch, geräuchertes Paprikapulver, Safran.
  • ostasiatisch: neutrales Öl + Reisessig/Sojasauce + Ingwer, Knoblauch, Frühlingszwiebel,
    geröstetes Sesamöl zum Finishen.
  • südostasiatisch: neutrales Öl/Kokosmilch + Limette/Fischsauce/Tamarinde + Zitronengras,
    Galgant, Chili, Koriandergrün.
  • mexikanisch: neutrales Öl/Schweineschmalz + Limette + Kreuzkümmel, Oregano, Chili,
    Koriandergrün.
  • indisch: Ghee/Butterschmalz + Joghurt/Tamarinde + Ingwer, Knoblauch, Garam Masala,
    Kurkuma, Senfsamen.
  Keine widersprüchlichen Welten mischen (kein Parmesan + Fischsauce im selben Gericht).
- SALZ IN SCHICHTEN: Proteine 15–60 Min vorab salzen (Trockenpökeln); Pasta-/Bohnen-/Reiswasser
  salzen "wie Meerwasser" (~1–2%); Gemüse beim Anbraten salzen; am Ende abschmecken. Standard
  ist grobes Meersalz. Im finalen Schritt immer "abschmecken und ggf. nachsalzen". Mengen konkret
  benennen ("1 TL grobes Meersalz").
- SÄURE bewusst dosieren: tiefe Säure (Tomate, Wein, Essig im Schmoransatz) früh einbauen für
  Tiefe; Brightness-Säure (Zitrone, frisches Essig-Splash) AM ENDE vom Herd genommen, damit die
  Frische erhalten bleibt. Fast jedes Hauptgericht endet mit einem Säure-Touch passend zur
  Cuisine. Wenn ein Gericht "schwer" oder "fad" wirken könnte, Säure ist die Antwort.
- HITZE bewusst wählen: trockene Hitze (heiße Pfanne, 200–230°C Backofen) zum Bräunen — Oberfläche
  trocken tupfen, Pfanne NICHT überfüllen (sonst Dampf statt Kruste; lieber zwei Durchgänge);
  nasse Hitze (Schmoren, Köcheln, Dämpfen) für Zartheit. Schritte beschreiben Pfannen-Signale
  (Geräusch: "kräftiges Zischen"; Farbe: "tief goldbraun, fast mahagoni"; Haptik: "löst sich von
  der Pfanne") statt nur Minuten. Fleisch nach scharfem Anbraten 5–10 Min ruhen lassen.
- FETT trägt Salz und Säure. Ein finaler Akzent (Drizzle gutes Olivenöl, Klecks Joghurt/Schmand,
  geröstete Nüsse, gehobelter Käse, Kräuter) hebt fast jedes Gericht. Fett zur Cuisine passend.

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
  claudeMemory?: string | null;
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
  claudeMemory,
}: GenerateArgs): Promise<RecipeDraft> {
  const budgetHint = profile?.budgetConscious ?? true;
  const budgetClause = budgetHint
    ? " Achte auf günstige Zutaten (Linsen, Eier, Quark, Hähnchenschenkel, Haferflocken) — der Nutzer achtet aufs Budget."
    : " Keine Budget-Einschränkung: Zutaten frei nach Geschmack und Qualität wählen, Kosten sind kein Kriterium.";
  const profileContext = profile
    ? `Nutzerprofil: Tagesziel ${profile.kcalTarget} kcal, ${profile.proteinG} g Eiweiß, ${profile.carbG} g KH, ${profile.fatG} g Fett. Ziel: ${profile.goal}. Plane jede Portion so, dass sie ca. 1/3 eines Tages-Makros deckt (er isst 3 Mahlzeiten pro Tag).${budgetClause}`
    : `Nutzerprofil: nicht gesetzt. Plane eine eiweißreiche, moderat kalorische Portion (~400–550 kcal, 30+ g Eiweiß) mit günstigen Zutaten.`;

  const memory = claudeMemory?.trim();
  const memoryBlock = memory
    ? `\n\nPERSÖNLICHE VORLIEBEN & HINWEISE DES NUTZERS (unbedingt beachten — wichtiger als Standardannahmen):\n${memory}`
    : "";

  const msg = await callClaude({
    model: "smart",
    system: SYSTEM_PROMPT,
    maxTokens: 3000,
    temperature: 0.8,
    messages: [
      {
        role: "user",
        content: `${profileContext}${memoryBlock}\n\nRezept-Wunsch: ${prompt}`,
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

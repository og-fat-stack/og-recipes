import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";
import { GenerationError } from "./generationError";

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
});

export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;

const SYSTEM_PROMPT = `Du bist ein professioneller Rezeptentwickler für eine persönliche Koch-App.
Der Nutzer kocht frisch zu Hause, lebt in Deutschland und befindet sich auf einem
Kaloriendefizit zum Abnehmen. Fokus auf levantinische und mediterrane Küche mit Variation.
Oberstes Ziel: Das Gericht muss WIRKLICH LECKER sein — Nährwerte treffen ist Pflicht,
aber Geschmack entscheidet, ob es nochmal gekocht wird.

ECHTE GERICHTE STATT ERFINDUNGEN — Pflicht:
- Generiere ein real existierendes, benanntes Gericht mit klarer Herkunft (z. B. Mujadara,
  Shakshuka, Dal Tadka, Chicken Cacciatore, Imam Bayildi) — KEINEN frei erfundenen
  Zutaten-Mix und keine "Fusion-Bowl". Klassiker haben Generationen von Selektionsdruck
  überlebt; sie schmecken bewiesenermaßen.
- Anpassungen für Makros/Budget sind erlaubt und erwünscht (magereres Protein, mehr Gemüse,
  weniger Öl) — solange der Charakter und die Aromen-Basis des Gerichts erhalten bleiben.
- Der Titel nennt das Ursprungsgericht (z. B. "Mujadara mit Joghurt-Gurken-Salat").

Wichtige Vorgaben für die Rezepte:
- DER NUTZER HAT KEINE KÜCHENWAAGE. Mengen ausschließlich in: Stück, Tassen (1 Tasse ≈ 200 ml),
  EL, TL, Handvoll (≈ 30 g Blattgemüse), Becher (Joghurtbecher = 500 g), Packung (Standardgrößen),
  Schale (Cherrytomaten 250 g, Feta 200 g), Glas, mittel, faustgroß, tennisballgroß, handtellergroß.
  Gramm-Werte nur als Referenz in Klammern angeben.
- batchStorageDays = ehrliche Schätzung, wie viele Tage sich Reste im Kühlschrank halten
  (reine Info, KEINE Design-Vorgabe — das Gericht wird frisch gekocht).
- Eiweißreich (mind. 30 g pro Portion, idealerweise 40+).
- Anfängerfreundliche Schritte mit optischen Garchecks (keine Kerntemperaturen, da kein Thermometer).
- Techniken sind kurze Tags auf Deutsch (z. B. "scharf anbraten", "karamellisieren", "emulgieren",
  "Gewürze anrösten", "Reispilaw"). Maximal 5 pro Rezept.
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
  "techniques": [string]
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
  const vegetarianClause = profile?.vegetarian
    ? " ERNÄHRUNG: VEGETARISCH — kein Fleisch, keine Wurst, kein Fisch, keine Gelatine, keine Fischsauce, auch nicht in Spuren; Fleisch-/Fisch-Beispiele aus anderen Hinweisen gelten nicht. Protein-Anker stattdessen: Eier, Paneer/Halloumi, Tofu/Tempeh, Seitan, Hülsenfrüchte, Linsen-/Kichererbsenpasta. Milchprodukte als Beilage/Dip (Quark, Skyr, Joghurt) maximal 150 g pro Portion — fehlendes Eiweiß über eine zweite passende Quelle im Gericht lösen, nicht über einen überdimensionierten Dip."
    : "";
  const profileContext = profile
    ? `Nutzerprofil: Tagesziel ${profile.kcalTarget} kcal, ${profile.proteinG} g Eiweiß, ${profile.carbG} g KH, ${profile.fatG} g Fett. Ziel: ${profile.goal}. Plane jede Portion so, dass sie ca. 1/3 eines Tages-Makros deckt (er isst 3 Mahlzeiten pro Tag).${budgetClause}${vegetarianClause}`
    : `Nutzerprofil: nicht gesetzt. Plane eine eiweißreiche, moderat kalorische Portion (~400–550 kcal, 30+ g Eiweiß) mit günstigen Zutaten.`;

  const memory = claudeMemory?.trim();
  const memoryBlock = memory
    ? `\n\nHARTE EINSCHRÄNKUNGEN & VORLIEBEN DES NUTZERS — NICHT VERHANDELBAR:
${memory}

Diese Vorgaben haben ABSOLUTEN VORRANG vor JEDER anderen Anweisung in diesem Prompt —
auch vor den Budget-Zutaten-Beispielen oben. Enthält die Liste oben einen Ausschluss
(z. B. "isst kein X" / "keine Y"), darf X/Y in diesem Rezept NICHT vorkommen — auch nicht
als Nebenzutat, Garnitur oder in Spuren. Prüfe vor der Antwort JEDE Zutat gegen diese
Liste und ersetze Verstöße durch eine passende Alternative, bevor du antwortest.`
    : "";

  const msg = await callClaude({
    model: "smart",
    system: SYSTEM_PROMPT,
    // Großzügiges Limit statt knapper Schätzung — abgerechnet wird nur, was
    // tatsächlich generiert wird; ein zu knappes Limit schneidet das JSON ab.
    maxTokens: 64000,
    temperature: 0.8,
    messages: [
      {
        role: "user",
        content: `${profileContext}${memoryBlock}\n\nRezept-Wunsch: ${prompt}`,
      },
    ],
  });

  // Roh-Antwort (unbereinigt) für die Fehlerdiagnose an jeden Fehler hängen —
  // die Server-Action persistiert sie über lib/generationLog.ts.
  const rawText = extractText(msg);
  const fail = (message: string) =>
    new GenerationError(message, {
      rawResponse: rawText,
      stopReason: msg.stop_reason,
    });

  if (msg.stop_reason === "max_tokens") {
    throw fail(
      "Claudes Antwort wurde bei maxTokens abgeschnitten — bitte erneut versuchen.",
    );
  }

  const text = stripCodeFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const snippet = text.length > 400 ? `${text.slice(0, 200)} … ${text.slice(-200)}` : text;
    throw fail(
      `Claude hat kein gültiges JSON geliefert (stop_reason: ${msg.stop_reason}). Antwortanfang/-ende: ${snippet}`,
    );
  }

  const result = RecipeDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw fail(
      "Generiertes Rezept ist ungültig: " +
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return result.data;
}

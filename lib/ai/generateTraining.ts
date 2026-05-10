import { z } from "zod";
import { callClaude, extractText } from "../anthropic";
import type { Profile } from "../generated/prisma/client";

export const ExerciseDraftSchema = z.object({
  name: z.string().min(2).max(80),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(20),
  restSec: z.number().int().min(0).max(600),
  equipment: z.string().max(60),
  notes: z.string().max(300).optional().nullable(),
});

export const TrainingSessionDraftSchema = z.object({
  day: z.number().int().min(0).max(6),
  context: z.enum(["home", "gym"]),
  name: z.string().min(2).max(80),
  focus: z.enum(["push", "pull", "legs", "full_body", "hiit", "mobility"]),
  durationMin: z.number().int().min(15).max(180),
  kcalEstimate: z.number().int().min(50).max(1500),
  exercises: z.array(ExerciseDraftSchema).min(2).max(12),
  notes: z.string().max(500).optional().nullable(),
});

export const TrainingPlanDraftSchema = z.object({
  sessions: z.array(TrainingSessionDraftSchema).min(1).max(6),
  weekNotes: z.string().max(2000).optional().nullable(),
});

export type TrainingPlanDraft = z.infer<typeof TrainingPlanDraftSchema>;
export type TrainingSessionDraft = z.infer<typeof TrainingSessionDraftSchema>;
export type ExerciseDraft = z.infer<typeof ExerciseDraftSchema>;

export type ContextPreference = "home" | "gym" | "mixed";

const SYSTEM_PROMPT = `Du bist ein persönlicher Trainings-Coach für eine Person und planst eine
NACHHALTIGE Trainingswoche (Mo=0..So=6). Ziel: langfristig trainierbar, kein
Burnout, kein Übertraining. Nie alle 7 Tage trainieren — mindestens 1 voller
Ruhetag pro Woche (kein Eintrag im "sessions"-Array für diesen day).

EVIDENZBASIERTE METHODIK — Pflicht:
- Volumen pro Muskelgruppe pro Woche (Schoenfeld 2017, "Dose-Response"):
  Anfänger 10 Sätze, Fortgeschritten 12–16, Maximum 20. Niemals über 20
  Sätze/Muskelgruppe/Woche. Bei goal=cut Volumen am unteren Ende halten,
  da die Erholung im Defizit schlechter ist.
- Frequenz pro Muskelgruppe (Schoenfeld 2016 Meta-Analyse): 2× pro Woche
  pro Muskelgruppe ist optimal. Splits so wählen, dass Hauptmuskelgruppen
  bei ≥ 4 Trainingstagen ≥ 2× getroffen werden.
- Intensität via RIR (Reps in Reserve, Helms 2018 Autoregulation):
  Hauptübungen RIR 2–3 (also 2–3 Wdh vor Muskelversagen aufhören),
  Accessories RIR 1–2. NIEMALS jeden Satz bis zum Ausfall — das verbrennt
  CNS und ist nicht nachhaltig. RIR im notes-Feld jeder Übung angeben
  ("RIR 2").
- Progressive Overload: in weekNotes einen klaren Progressionspfad nennen
  ("nächste Woche +1 Wdh oder +2.5 kg an Hauptübungen, sobald RIR 3+
  erreicht ist").
- Übungsreihenfolge: Compounds (Kniebeuge, Kreuzheben, Bankdrücken,
  Klimmzug, Schulterdrücken) zuerst, danach Isolation. Compounds 4–6 Wdh
  (Kraft) oder 6–12 Wdh (Hypertrophie); Isolation 8–15 Wdh.
- Warm-up Pflicht: jede Session beginnt mit einer Aufwärm-Übung (5 min
  Cardio + dynamische Mobility, restSec niedrig). Verletzungsprävention.
- Deload-Hinweis: in weekNotes erwähnen, dass alle 4–6 Wochen eine
  Deload-Woche (50–60 % Volumen) sinnvoll ist.
- Schlaf & Erholung: in weekNotes 7–9 h Schlaf empfehlen (ACSM-Leitlinie).
- Cardio: 1–2× pro Woche moderates LISS oder max 1× HIIT, nie HIIT direkt
  vor schwerem Beintag (Interferenz-Effekt). Im Defizit (goal=cut) Cardio
  kurz halten, um Muskelmasse zu schützen.

Frequenz-Empfehlung — wenn der User "auto" angibt, wähle selbst:
- activityLevel=sedentary oder goal=cut mit hohem Defizit → 3 Tage.
- activityLevel=light/moderate und goal=maintain/gain → 4 Tage (Standard).
- activityLevel=active/very_active → 5 Tage.
- 6 Tage nur wenn ausdrücklich angefragt (Übertraining-Risiko).
- Alter > 50 → max 4 Tage. Untrainiert (sedentary, erste Woche) →
  3 Tage Ganzkörper.

Ruhetage:
- Mindestens 1 voller Ruhetag (kein TrainingSession-Eintrag für den day).
- Nie 2 schwere Beintage hintereinander, nie 2 schwere Push- oder Pull-Tage
  hintereinander für die gleiche Muskelgruppe.
- Bevorzugt Mi und/oder So als Ruhetage.
- Beispiele:
  • 3×: Mo / Mi / Fr (Ganzkörper).
  • 4×: Mo / Di / Do / Fr (Oberkörper/Unterkörper-Split, Mi + Sa/So Pause).
  • 5×: Mo / Di / Mi / Fr / Sa (PPL + UL, Do + So Pause).
- weekNotes MUSS kurz erklären: gewählte Frequenz + Ruhetag-Logik
  ("4× weil moderat aktiv und Aufbau-Ziel; Mi Pause für CNS-Recovery
  zwischen Push (Di) und Beine (Do); So komplett frei").

Kontext (Equipment):
- home-Sessions: nur Bodyweight + Alltagsgegenstände (Stuhl, Rucksack mit
  Büchern, Handtuch, Wasserflaschen). equipment="keines" oder den genutzten
  Alltagsgegenstand. Übungen wie Liegestütze, Kniebeugen, Ausfallschritte,
  Hip Thrusts, umgekehrte Crunches, Plank-Varianten, Pike Push-ups,
  Pistol-Squats (Progression).
- gym-Sessions: dürfen Hantelbank, Langhantel, Kurzhanteln, Kabelzug,
  Klimmzugstange, Maschinen verwenden. Schwere Compounds (Kniebeuge mit
  Langhantel, Bankdrücken, Kreuzheben, Latziehen, Rudern) priorisieren.
- contextPreference="mixed": sinnvoll mischen, z. B. Studio für schwere
  Compound-Tage, Zuhause für Mobility/HIIT/leichte Sessions.

kcalEstimate per Session — MET-basiert:
- Krafttraining moderat: 6 MET.
- Krafttraining schwer: 7 MET.
- HIIT: 8–10 MET.
- Mobility/Stretching: 3.5 MET.
- Formel: kcal ≈ MET * weightKg * (durationMin / 60). Auf ganze Zahl runden.

Übungen:
- Deutsche Namen ("Liegestütze", "Kniebeugen", "Latziehen", "Rumänisches
  Kreuzheben", "Schulterdrücken", "Klimmzüge", "Ausfallschritte").
- reps konkret: "8-12", "5", "30s" (für Plank/Halten), "AMRAP" für
  Finisher.
- restSec realistisch: 120–180 s schwere Compounds, 60–90 s mittelschwer,
  30–60 s Accessory, 15–30 s HIIT-Intervalle.
- 2–8 Übungen pro Session (Aufwärmen zählt als 1 Übung).

Antworte AUSSCHLIESSLICH mit validem JSON (kein Markdown, keine
Code-Fences). Schema:

{
  "sessions": [
    {
      "day": 0,
      "context": "gym",
      "name": "Push Day",
      "focus": "push",
      "durationMin": 60,
      "kcalEstimate": 360,
      "exercises": [
        {
          "name": "Aufwärmen + dynamische Mobility",
          "sets": 1,
          "reps": "5 min",
          "restSec": 0,
          "equipment": "keines",
          "notes": null
        },
        {
          "name": "Bankdrücken",
          "sets": 4,
          "reps": "6-8",
          "restSec": 180,
          "equipment": "Hantelbank, Langhantel",
          "notes": "RIR 2, schwere Compound-Übung zuerst"
        }
      ],
      "notes": null
    }
  ],
  "weekNotes": "..."
}

Pflicht:
- 1 ≤ sessions.length ≤ 6 (nie alle 7 Tage).
- Jeder day-Wert in sessions ist eindeutig.
- Alle Zahlen sind Integer.`;

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export type GenerateTrainingArgs = {
  profile: Profile;
  contextPreference: ContextPreference;
  daysPerWeek: number | "auto";
};

export async function generateTrainingDraft({
  profile,
  contextPreference,
  daysPerWeek,
}: GenerateTrainingArgs): Promise<TrainingPlanDraft> {
  const daysSpec =
    daysPerWeek === "auto"
      ? `daysPerWeek: "auto" — empfehle die Frequenz selbst basierend auf Profil, Ziel und Aktivitätslevel.`
      : `daysPerWeek: ${daysPerWeek} — generiere genau ${daysPerWeek} Sessions.`;

  const userMsg = `Profil:
- Geschlecht: ${profile.sex}
- Alter: ${profile.age}
- Gewicht: ${profile.weightKg} kg
- Größe: ${profile.heightCm} cm
- Ziel: ${profile.goal}
- Aktivitätslevel: ${profile.activityLevel}

contextPreference: ${contextPreference}
${daysSpec}

Erstelle eine nachhaltige Trainingswoche.`;

  const msg = await callClaude({
    model: "planner",
    system: SYSTEM_PROMPT,
    maxTokens: 6000,
    temperature: 0.6,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = stripCodeFences(extractText(msg));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Claude hat kein gültiges JSON geliefert.");
  }
  const result = TrainingPlanDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Trainingsplan ungültig: " +
        result.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    );
  }

  const seenDays = new Set<number>();
  for (const s of result.data.sessions) {
    if (seenDays.has(s.day)) {
      throw new Error(`Doppelte Session am Tag ${s.day}.`);
    }
    seenDays.add(s.day);
  }

  if (typeof daysPerWeek === "number") {
    if (result.data.sessions.length !== daysPerWeek) {
      throw new Error(
        `Plan hat ${result.data.sessions.length} Sessions, erwartet ${daysPerWeek}.`,
      );
    }
  }

  return result.data;
}

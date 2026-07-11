/**
 * Kuratierter Wochenplan, abgestimmt auf das aktuelle Ziel (Cut / Bauchfett
 * reduzieren, Start sedentary). KOMPLETT ZU HAUSE, überwiegend reines
 * Körpergewicht — Equipment optional (Türreck/Klimmzugstange oder ein
 * Widerstandsband für die Zug-Übungen; sonst reicht ein stabiler Tisch/Stuhl).
 * Logik dahinter:
 * - 3× Ganzkörper-Krafttraining (Mo/Mi/Fr) hält die Muskulatur im Defizit →
 *   verlorenes Gewicht ist Fett, nicht Muskel. Progressiver Reiz über Tempo,
 *   Hebel (Füße erhöht, einbeinig) und Wiederholungen statt mehr Gewicht.
 * - 2× lockeres Zone-2-Cardio (Di/Do): zügig gehen draußen oder Bodyweight-
 *   Cardio zu Hause (~Puls 115–135/min) für Verbrauch bei geringer Belastung.
 * - Täglich 8–10k Schritte als größter, nachhaltigster Hebel (NEAT).
 * - Bauchtraining formt den Muskel, verbrennt aber kein Bauchfett gezielt.
 */

import { STEP_GOAL_MIN, stepsKcal } from "./steps";

export type TrainingKind = "strength" | "cardio" | "active" | "rest";

export type TrainingDay = {
  /** 0 = Mo … 6 = So */
  day: number;
  label: string;
  kind: TrainingKind;
  title: string;
  /** Aktive Zeit, ohne Schritte/Alltag. */
  durationMin: number;
  items: string[];
};

export const KIND_META: Record<
  TrainingKind,
  { label: string; emoji: string; chip: string }
> = {
  strength: {
    label: "Kraft",
    emoji: "🏋️",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  cardio: {
    label: "Cardio",
    emoji: "🚶",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  active: {
    label: "Aktiv erholen",
    emoji: "🌿",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  rest: {
    label: "Pause",
    emoji: "😴",
    chip: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

/** Zuhause-Variante: überwiegend reines Körpergewicht, Equipment optional. */
export const WEEKLY_PLAN_HOME: TrainingDay[] = [
  {
    day: 0,
    label: "Mo",
    kind: "strength",
    title: "Ganzkörper A (Push) + Core",
    durationMin: 45,
    items: [
      "Kniebeuge (Körpergewicht) — 3×15–20, langsam runter (Progression: Tempo/Pause, dann einbeinig)",
      "Liegestütze — 3×8–15 (leichter: Hände erhöht/Knie · schwerer: Füße erhöht)",
      "Umgekehrtes Rudern unterm stabilen Tisch (oder Band-Rudern) — 3×8–12",
      "Pike-Liegestütze (Schultern) — 3×6–12",
      "Plank — 3× 30–45 s",
    ],
  },
  {
    day: 1,
    label: "Di",
    kind: "cardio",
    title: "Zone-2-Cardio (zu Hause / draußen)",
    durationMin: 35,
    items: [
      "Zügig gehen draußen ~5,5–6,5 km/h (30–40 Min) — oder Treppen für mehr Puls",
      "Ohne Platz: lockeres Seilspringen, Marschieren auf der Stelle, Schattenboxen",
      "Puls ~115–135/min (Zone 2) — Reden muss noch gehen",
    ],
  },
  {
    day: 2,
    label: "Mi",
    kind: "strength",
    title: "Ganzkörper B (Beine + Pull) + Core",
    durationMin: 45,
    items: [
      "Ausfallschritte / Split Squats — 3×10–12 je Bein",
      "Glute Bridge / Hip Thrust (einbeinig als Progression) — 3×12–15",
      "Umgekehrtes Rudern oder Klimmzüge (falls Türreck) — 3×6–10",
      "Dips zwischen zwei Stühlen (oder Bank-Dips) — 3×8–12",
      "Liegendes Beinheben — 3×12–15",
    ],
  },
  {
    day: 3,
    label: "Do",
    kind: "cardio",
    title: "Cardio / Intervalle (zu Hause)",
    durationMin: 35,
    items: [
      "Zone-2 gehen 30–40 Min — oder 1×/Woche kurzes Bodyweight-HIIT (10–15 Min)",
      "HIIT-Zirkel: Burpees, Mountain Climbers, High Knees, Hampelmänner (30 s / 30 s Pause)",
      "Sauber bleiben — Technik vor Tempo",
    ],
  },
  {
    day: 4,
    label: "Fr",
    kind: "strength",
    title: "Ganzkörper C (gemischt)",
    durationMin: 45,
    items: [
      "Bulgarian Split Squat (hinterer Fuß auf Stuhl) — 3×8–12 je Bein",
      "Pike-Liegestütze oder Schulterdrücken mit Rucksack — 3×8–12",
      "Klimmzüge / Türreck- oder Band-Rudern — 3×6–10",
      "Liegestütze (eng/breit) — 3× so viele wie sauber gehen",
      "Side-Plank + Plank-Reach — 3× 30–45 s",
    ],
  },
  {
    day: 5,
    label: "Sa",
    kind: "active",
    title: "Aktiv erholen",
    durationMin: 60,
    items: [
      "Langer Spaziergang oder lockere Radtour",
      "Mobility / leichtes Dehnen",
      "Hauptsache in Bewegung bleiben",
    ],
  },
  {
    day: 6,
    label: "So",
    kind: "rest",
    title: "Pause",
    durationMin: 0,
    items: [
      "Echter Ruhetag",
      "Schlaf priorisieren (wichtig fürs Bauchfett)",
      "Trotzdem ein paar Schritte sammeln",
    ],
  },
];

/** Gym-Variante: freie Gewichte, Maschinen und Laufband. */
export const WEEKLY_PLAN_GYM: TrainingDay[] = [
  {
    day: 0,
    label: "Mo",
    kind: "strength",
    title: "Ganzkörper A + Bauch",
    durationMin: 50,
    items: [
      "Kniebeuge — 3×8–10",
      "Bankdrücken — 3×8–10",
      "Latzug / Klimmzüge — 3×8–10",
      "Schulterdrücken — 3×10–12",
      "Plank — 3× 30–45 s",
    ],
  },
  {
    day: 1,
    label: "Di",
    kind: "cardio",
    title: "Zone-2-Cardio (Laufband)",
    durationMin: 35,
    items: [
      "Laufband, zügig gehen: ~5,5–6,5 km/h",
      "Steigung 4–6 % → hebt den Puls, gelenkschonend",
      "Puls ~115–135/min (Zone 2) — Reden muss noch gehen",
    ],
  },
  {
    day: 2,
    label: "Mi",
    kind: "strength",
    title: "Ganzkörper B + Bauch",
    durationMin: 50,
    items: [
      "Kreuzheben oder Hip Thrust — 3×8–10",
      "Schrägbankdrücken / Dips — 3×8–10",
      "Rudern (Kurzhantel/Kabel) — 3×10–12",
      "Ausfallschritte — 3×10 je Bein",
      "Hängendes/liegendes Beinheben — 3×12",
    ],
  },
  {
    day: 3,
    label: "Do",
    kind: "cardio",
    title: "Zone-2-Cardio (Laufband)",
    durationMin: 35,
    items: [
      "Laufband, zügig gehen: ~5,5–6,5 km/h, Steigung 4–6 %",
      "Puls ~115–135/min (Zone 2), gleichmäßiges Tempo",
      "Optional 1×/Woche statt Zone 2: kurzes HIIT (10–15 Min)",
    ],
  },
  {
    day: 4,
    label: "Fr",
    kind: "strength",
    title: "Ganzkörper C",
    durationMin: 50,
    items: [
      "Beinpresse oder Goblet-Squat — 3×10–12",
      "Schulterdrücken — 3×8–10",
      "Klimmzüge / Latzug — 3×8–10",
      "Bizeps + Trizeps — je 2×12",
      "Plank-Variationen — 3× 30–45 s",
    ],
  },
  {
    day: 5,
    label: "Sa",
    kind: "active",
    title: "Aktiv erholen",
    durationMin: 60,
    items: [
      "Langer Spaziergang oder lockere Radtour",
      "Mobility / leichtes Dehnen",
      "Hauptsache in Bewegung bleiben",
    ],
  },
  {
    day: 6,
    label: "So",
    kind: "rest",
    title: "Pause",
    durationMin: 0,
    items: [
      "Echter Ruhetag",
      "Schlaf priorisieren (wichtig fürs Bauchfett)",
      "Trotzdem ein paar Schritte sammeln",
    ],
  },
];

export type PlanVariant = "home" | "gym";

export const PLAN_VARIANTS: Record<
  PlanVariant,
  { label: string; short: string; plan: TrainingDay[] }
> = {
  home: { label: "Zu Hause", short: "🏠 Körpergewicht", plan: WEEKLY_PLAN_HOME },
  gym: { label: "Gym", short: "🏋️ Gym", plan: WEEKLY_PLAN_GYM },
};

/** Normalisiert einen (evtl. undefinierten) Query-Wert auf eine gültige Variante. */
export function resolvePlanVariant(v: string | undefined): PlanVariant {
  return v === "gym" ? "gym" : "home";
}

/**
 * Standard-Plan für Makro-Berechnung und Tages-Checkliste. Beide Varianten sind
 * energetisch nahezu gleich (gleiche `kind`-Struktur, ähnliche Dauer), daher
 * hängt der Kalorienbedarf NICHT davon ab, welche Variante gerade angezeigt wird.
 */
export const WEEKLY_PLAN: TrainingDay[] = WEEKLY_PLAN_HOME;

/** Wöchentliche aktive Trainingszeit (ohne Schritte). */
export function weeklyActiveMinutes(plan: TrainingDay[] = WEEKLY_PLAN): number {
  return plan.reduce((sum, d) => sum + d.durationMin, 0);
}

/**
 * Grobe MET-Werte je Trainingsart (Compendium of Physical Activities,
 * konservativ gewählt):
 * - strength: Krafttraining moderat-kräftig mit Pausen
 * - cardio:   zügiges Gehen / lockeres Bodyweight-Cardio (Zone 2)
 * - active:   lockerer langer Spaziergang
 */
const KIND_MET: Record<TrainingKind, number> = {
  strength: 5,
  cardio: 5.5,
  active: 3.5,
  rest: 0,
};

/**
 * NETTO-Kalorienverbrauch eines Trainingstags. Es wird (MET − 1) gerechnet, weil
 * der Ruheumsatz (1 MET) für diese Zeit bereits im TDEE enthalten ist — sonst
 * würde man ihn doppelt zählen und die Zufuhr überschätzen.
 */
export function dayTrainingKcal(day: TrainingDay, weightKg: number): number {
  const met = KIND_MET[day.kind];
  if (met <= 1 || day.durationMin <= 0) return 0;
  const netKcalPerMin = ((met - 1) * 3.5 * weightKg) / 200;
  return Math.round(netKcalPerMin * day.durationMin);
}

/** Netto-Trainingsverbrauch über die ganze Woche. */
export function weeklyTrainingKcal(weightKg: number): number {
  return WEEKLY_PLAN.reduce((sum, d) => sum + dayTrainingKcal(d, weightKg), 0);
}

/**
 * Über die Woche gemittelter Verbrauch der STRUKTURIERTEN Einheiten pro Tag.
 */
export function trainingKcalPerDay(weightKg: number): number {
  return Math.round(weeklyTrainingKcal(weightKg) / 7);
}

/** Schrittfrequenz beim zügigen Gehen am Laufband (Schritte/Min). */
const TREADMILL_CADENCE = 105;

/**
 * Zusätzliche Geh-Kalorien eines Tages aus dem Schritt-Ziel ({@link STEP_GOAL_MIN}).
 * An Laufband-Cardio-Tagen zählt das Cardio bereits ZU den 8k (gesundheitlich
 * sind ~8k das Tagesziel, nicht 12k) — daher werden nur die Restschritte extra
 * gerechnet, sonst würde der Cardio-Anteil doppelt zählen.
 */
function dayStepsKcal(day: TrainingDay, weightKg: number): number {
  const cardioSteps =
    day.kind === "cardio" ? day.durationMin * TREADMILL_CADENCE : 0;
  const extraSteps = Math.max(0, STEP_GOAL_MIN - cardioSteps);
  return stepsKcal(extraSteps, weightKg);
}

/**
 * Gesamte Plan-Aktivität pro Tag (kcal): strukturierte Einheiten + tägliche
 * Schritte (8k-Ziel). Genau dieser Wert wird in der Makro-Berechnung auf den
 * Grundbedarf (sedentary) addiert — die Aktivität kommt also vollständig aus
 * dem Trainingsplan, nicht aus einem manuell gewählten Aktivitätslevel.
 *
 * Schritt-Ziel konservativ mit der Untergrenze ({@link STEP_GOAL_MIN}); an
 * Cardio-Tagen ohne Doppelzählung (siehe {@link dayStepsKcal}).
 */
export function planActivityKcalPerDay(weightKg: number): number {
  const weekly = WEEKLY_PLAN.reduce(
    (sum, d) => sum + dayTrainingKcal(d, weightKg) + dayStepsKcal(d, weightKg),
    0,
  );
  return Math.round(weekly / 7);
}

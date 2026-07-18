import { db } from "./db";
import type { Ingredient } from "./recipe";

/**
 * Feste Snack-Bibliothek für die Zwischenmahlzeit-Slots des Wochenplans.
 *
 * Idee (siehe Plan-Generator): Statt 3 Mahlzeiten mit je ~53 g Eiweiß zu
 * erzwingen (was zu absurden Beilagen wie 260 g Quark neben einem Dal führt),
 * tragen 1–2 feste Snacks pro Tag einen konstanten Eiweiß-Sockel. Die
 * Hauptmahlzeiten müssen dann nur noch 30–42 g treffen — kulinarisch entspannt.
 *
 * Alle Snacks sind vegetarisch, ohne Kochaufwand und bewusst auf ein ähnliches
 * Makro-Profil normiert (~200–260 kcal, 27–34 g Eiweiß), damit die Tage
 * untereinander vergleichbar bleiben und die Rotation nur den Geschmack
 * variiert, nicht die Bilanz.
 */
export const SNACK_CUISINE = "Snack";

export type SnackDef = {
  title: string;
  kcalPerPortion: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  ingredients: Ingredient[];
  steps: string[];
  techniques: string[];
};

export const SNACKS: SnackDef[] = [
  {
    title: "Whey-Shake mit Milch",
    kcalPerPortion: 255,
    proteinG: 34,
    carbG: 17,
    fatG: 5,
    ingredients: [
      { name: "Fettarme Milch (1,5 %)", qty: 300, unit: "ml" },
      { name: "Whey-Proteinpulver", qty: 30, unit: "g" },
    ],
    steps: [
      "300 ml kalte fettarme Milch mit 30 g Whey-Proteinpulver im Shaker 15–20 Sekunden kräftig schütteln, bis keine Klümpchen mehr zu sehen sind.",
    ],
    techniques: ["shaken"],
  },
  {
    title: "Skyr-Bowl mit Beeren",
    kcalPerPortion: 235,
    proteinG: 34,
    carbG: 21,
    fatG: 1,
    ingredients: [
      { name: "Skyr natur", qty: 300, unit: "g" },
      { name: "TK-Beerenmischung", qty: 100, unit: "g" },
    ],
    steps: [
      "100 g TK-Beeren kurz in der Mikrowelle (ca. 1 Minute) oder bei Zimmertemperatur auftauen lassen.",
      "300 g Skyr in eine Schale geben, die Beeren samt Saft darüber verteilen.",
    ],
    techniques: ["anrichten"],
  },
  {
    title: "Schoko-Proteinpudding",
    kcalPerPortion: 215,
    proteinG: 32,
    carbG: 12,
    fatG: 3,
    ingredients: [
      { name: "Magerquark", qty: 250, unit: "g" },
      { name: "Backkakao", qty: 10, unit: "g" },
      { name: "Fettarme Milch (1,5 %)", qty: 30, unit: "ml" },
      { name: "Süßstoff nach Geschmack", qty: 1, unit: "Prise" },
    ],
    steps: [
      "250 g Magerquark mit 10 g Backkakao, 30 ml Milch und Süßstoff nach Geschmack glatt rühren — so lange, bis der Kakao vollständig eingearbeitet ist und der Pudding dunkel glänzt.",
    ],
    techniques: ["verrühren"],
  },
  {
    title: "Hüttenkäse-Teller mit Gurke und Tomate",
    kcalPerPortion: 235,
    proteinG: 27,
    carbG: 10,
    fatG: 9,
    ingredients: [
      { name: "Körniger Frischkäse (Hüttenkäse)", qty: 200, unit: "g" },
      { name: "Gurke", qty: 100, unit: "g" },
      { name: "Cherrytomaten", qty: 100, unit: "g" },
      { name: "Schwarzer Pfeffer", qty: 1, unit: "Prise" },
    ],
    steps: [
      "100 g Gurke und 100 g Cherrytomaten in mundgerechte Stücke schneiden.",
      "200 g körnigen Frischkäse daneben anrichten und mit frisch gemahlenem schwarzem Pfeffer bestreuen.",
    ],
    techniques: ["anrichten"],
  },
];

/**
 * Wie viele Snack-Slots pro Tag? So gewählt, dass die 3 Hauptmahlzeiten bei
 * ~30–42 g Eiweiß landen (mehr pro Mahlzeit bringt für die Muskelprotein-
 * synthese kaum etwas und zwingt zu unrealistischen Rezepten): kleinster Wert
 * s in 0..2, für den (proteinTarget − s·32) / 3 ≤ 42 g gilt.
 */
export function snacksPerDayFor(proteinTargetG: number): number {
  const AVG_SNACK_PROTEIN = 32;
  const MAX_MAIN_MEAL_PROTEIN = 42;
  const s = Math.ceil((proteinTargetG - 3 * MAX_MAIN_MEAL_PROTEIN) / AVG_SNACK_PROTEIN);
  return Math.min(2, Math.max(0, s));
}

export type SnackSlot = "snack1" | "snack2";

export type PlannedSnack = { slot: SnackSlot; snack: SnackDef };

export type SnackPlan = {
  /** Tag (0=Mo … 6=So) → Snacks dieses Tages. Leer bei snacksPerDay = 0. */
  byDay: Map<number, PlannedSnack[]>;
  /** Tag → Makro-Summe der Snacks (wird von den Tageszielen abgezogen). */
  macrosByDay: Map<number, { kcal: number; protein: number; carb: number; fat: number }>;
  snacksPerDay: number;
};

/**
 * Verteilt die Snacks deterministisch auf den Tagesbereich: Rotation durch die
 * Bibliothek für Abwechslung, Offset 2 zwischen den beiden Slots eines Tages,
 * damit nie zweimal derselbe Snack am selben Tag liegt. Bei nur einem Snack
 * pro Tag liegt er nachmittags (snack2) — die längste Lücke ist Mittag→Abend.
 */
export function buildSnackPlan(args: {
  proteinTargetG: number;
  startDay: number;
  endDay: number;
}): SnackPlan {
  const snacksPerDay = snacksPerDayFor(args.proteinTargetG);
  const byDay = new Map<number, PlannedSnack[]>();
  const macrosByDay = new Map<
    number,
    { kcal: number; protein: number; carb: number; fat: number }
  >();

  for (let day = args.startDay; day <= args.endDay; day++) {
    const slots: SnackSlot[] =
      snacksPerDay === 2 ? ["snack1", "snack2"] : snacksPerDay === 1 ? ["snack2"] : [];
    const planned = slots.map((slot, i) => ({
      slot,
      snack: SNACKS[(day + i * 2) % SNACKS.length],
    }));
    byDay.set(day, planned);
    macrosByDay.set(
      day,
      planned.reduce(
        (acc, p) => ({
          kcal: acc.kcal + p.snack.kcalPerPortion,
          protein: acc.protein + p.snack.proteinG,
          carb: acc.carb + p.snack.carbG,
          fat: acc.fat + p.snack.fatG,
        }),
        { kcal: 0, protein: 0, carb: 0, fat: 0 },
      ),
    );
  }
  return { byDay, macrosByDay, snacksPerDay };
}

/**
 * Legt die verwendeten Snacks als Rezepte des Nutzers an (cuisine "Snack")
 * bzw. gleicht bestehende auf den aktuellen Bibliotheksstand ab, damit
 * Einkaufsliste und Plan-Anzeige wie bei jedem anderen Rezept funktionieren.
 * Liefert title → recipeId.
 */
export async function upsertSnackRecipes(
  userId: number,
  snacks: SnackDef[],
): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const s of snacks) {
    if (ids.has(s.title)) continue;
    const data = {
      cuisine: SNACK_CUISINE,
      portions: 1,
      kcalPerPortion: s.kcalPerPortion,
      proteinG: s.proteinG,
      carbG: s.carbG,
      fatG: s.fatG,
      batchStorageDays: 1,
      ingredients: s.ingredients,
      steps: s.steps,
      techniques: s.techniques,
    };
    const existing = await db.recipe.findFirst({
      where: { userId, title: s.title, cuisine: SNACK_CUISINE },
      select: { id: true },
    });
    const row = existing
      ? await db.recipe.update({ where: { id: existing.id }, data })
      : await db.recipe.create({ data: { userId, title: s.title, ...data } });
    ids.set(s.title, row.id);
  }
  return ids;
}

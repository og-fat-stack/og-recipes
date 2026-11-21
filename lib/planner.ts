import { db } from "./db";
import type { Profile } from "./generated/prisma/client";
import { classifyFishRecipe, type FishGroup } from "./fish";
import type { Ingredient } from "./recipe";
import { buildSnackPlan, type SnackPlan } from "./snacks";
import { getSides } from "./sides";
import { findRecipeUrls, type SearchRequest } from "./ai/findRecipes";
import { selectPlan, type PlanCandidate, type PlanSelection } from "./ai/selectPlan";
import { fetchRecipes, toPlanCandidates, type Candidate } from "./recipeImport/candidates";
import { logGenerationFailure } from "./generationLog";
import { FIND_PROMPT_VERSION } from "./ai/promptVersions";

/**
 * Wochenplan-Ablauf ohne von Claude erfundene Rezepte:
 *   1. Kandidaten aus der eigenen Sammlung holen.
 *   2. Fehlt etwas (zu wenige frische Gerichte/Frühstücke, kein passender
 *      Fisch, Zutat zum Aufbrauchen), per Web-Suche echte Rezepte finden,
 *      laden und mit dem BLS nachrechnen.
 *   3. Claude wählt aus, die App skaliert Portionen und ergänzt Beilagen.
 */

type PoolRecipe = PlanCandidate & { id: number };

export type PlanResult = {
  candidates: (PlanCandidate & { id?: number; url?: string; draft?: Candidate["draft"] })[];
  selection: PlanSelection;
};

/**
 * Rezepte, die für die Planung infrage kommen: nie abgelehnte, keine Snacks
 * oder Beilagen. Von Claude früher selbst erfundene Rezepte nur, wenn sie
 * gemocht wurden — alles andere (importiert, gefunden, von Hand) immer.
 */
export async function getRecipePool(userId: number, recentTitles: Set<string>): Promise<PoolRecipe[]> {
  const rows = await db.recipe.findMany({
    where: {
      userId,
      cuisine: { notIn: ["Snack", "Beilage"] },
      OR: [
        { liked: true },
        {
          liked: null,
          OR: [
            { promptVersion: null },
            { promptVersion: { startsWith: "import" } },
            { promptVersion: { startsWith: "find" } },
          ],
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  return rows
    .filter((r) => r.mealType !== "snack" && r.mealType !== "side")
    .map((r) => ({
      id: r.id,
      title: r.title,
      cuisine: r.cuisine,
      mealType: r.mealType === "breakfast" || r.cuisine === "Frühstück" ? "breakfast" : "main",
      portions: r.portions,
      kcalPerPortion: r.kcalPerPortion,
      proteinG: r.proteinG,
      carbG: r.carbG,
      fatG: r.fatG,
      batchStorageDays: r.batchStorageDays,
      ingredients: (r.ingredients as unknown as Ingredient[]) ?? [],
      origin: r.liked ? "liked" : "collection",
      recent: recentTitles.has(r.title),
    }));
}

function recipeText(c: { title: string; ingredients: Ingredient[] }): string {
  return `${c.title} ${c.ingredients.map((i) => i.name).join(" ")}`;
}

/** Richtwert pro Hauptmahlzeit: Tagesziel minus feste Snacks, gedrittelt. */
export function perMealTarget(profile: Profile): { kcal: number; protein: number } {
  const snacks = buildSnackPlan({ proteinTargetG: profile.proteinG, startDay: 0, endDay: 0 });
  const s = snacks.macrosByDay.get(0) ?? { kcal: 0, protein: 0 };
  return {
    kcal: Math.round((profile.kcalTarget - s.kcal) / 3),
    protein: Math.round(Math.max(0, profile.proteinG - s.protein) / 3),
  };
}

/** Wie viele verschiedene Gerichte braucht ein Tagesbereich? */
export function neededCounts(dayCount: number): { mains: number; breakfasts: number } {
  return {
    mains: Math.max(1, Math.round((dayCount * 4) / 7)),
    breakfasts: dayCount >= 6 ? 3 : dayCount >= 3 ? 2 : 1,
  };
}

export async function buildPlan(args: {
  userId: number;
  profile: Profile;
  dayRange: { start: number; end: number };
  snackPlan: SnackPlan;
  recentTitles: string[];
  useUpIngredients: string[];
  claudeMemory: string | null;
  lastFishGroups: FishGroup[];
}): Promise<PlanResult> {
  const { userId, profile } = args;
  const dayCount = args.dayRange.end - args.dayRange.start + 1;
  const recent = new Set(args.recentTitles);
  const pool = await getRecipePool(userId, recent);
  const fresh = pool.filter((c) => !c.recent);
  const need = neededCounts(dayCount);

  // --- Was fehlt in der Sammlung? -----------------------------------------
  const requests: SearchRequest[] = [];
  const freshMains = fresh.filter((c) => c.mealType === "main");
  const freshBreakfasts = fresh.filter((c) => c.mealType === "breakfast");

  let wantedFish: FishGroup | null = null;
  if (!profile.vegetarian && dayCount >= 3) {
    wantedFish =
      args.lastFishGroups.length === 1
        ? args.lastFishGroups[0] === "omega3"
          ? "weissfisch"
          : "omega3"
        : "omega3";
    const hasFish = freshMains.some((c) => classifyFishRecipe(recipeText(c)) === wantedFish);
    if (hasFish) wantedFish = null;
    else
      requests.push({
        id: "fisch",
        mealType: "main",
        count: 1,
        wish:
          wantedFish === "weissfisch"
            ? "Hauptgericht mit Weißfisch (Seelachs, Kabeljau, Schellfisch oder Scholle)"
            : "Hauptgericht mit Omega-3-Fisch (Sardinen, Hering, Makrele oder Lachs)",
      });
  }

  if (args.useUpIngredients.length) {
    const words = args.useUpIngredients.map((w) => w.toLowerCase());
    const covered = fresh.some((c) => words.some((w) => recipeText(c).toLowerCase().includes(w)));
    if (!covered)
      requests.push({
        id: "aufbrauchen",
        mealType: "main",
        count: 1,
        wish: `Hauptgericht, das diese Zutaten verwendet: ${args.useUpIngredients.join(", ")}`,
      });
  }

  // Etwas Auswahl über das Minimum hinaus, damit Claude abwechseln kann.
  const mainsMissing = need.mains + 1 - freshMains.length - requests.length;
  if (mainsMissing > 0)
    requests.push({
      id: "haupt",
      mealType: "main",
      count: Math.min(6, mainsMissing),
      wish:
        "abwechslungsreiche, eiweißreiche Hauptgerichte aus verschiedenen Küchen (z. B. levantinisch, mediterran, indisch, ostasiatisch, mexikanisch) mit wechselnden Protein-Ankern (Hülsenfrüchte, Eier, Geflügel, Tofu); höchstens eins mit rotem Fleisch",
    });
  const breakfastsMissing = need.breakfasts - freshBreakfasts.length;
  if (breakfastsMissing > 0)
    requests.push({
      id: "fruehstueck",
      mealType: "breakfast",
      count: Math.min(3, breakfastsMissing),
      wish: "einfache, eiweißreiche Frühstücke mit 5–10 Minuten Aufwand (z. B. Overnight Oats, Quark- oder Skyr-Bowl, Rührei, Porridge), deutlich verschieden voneinander",
    });

  // --- Web-Suche ----------------------------------------------------------
  let found: Candidate[] = [];
  if (requests.length > 0) {
    const perMeal = perMealTarget(profile);
    try {
      const urlsById = await findRecipeUrls({
        requests,
        vegetarian: profile.vegetarian,
        claudeMemory: args.claudeMemory,
        budgetConscious: profile.budgetConscious,
        perMeal,
        avoidTitles: pool.map((c) => c.title),
      });
      // Pro Suchauftrag laden (der Auftrag bestimmt Frühstück vs. Hauptgericht)
      // und höchstens count + 1 Treffer weiterverarbeiten.
      const perRequest = await Promise.all(
        requests.map(async (r) => {
          const fetched = await fetchRecipes(urlsById.get(r.id) ?? []);
          return fetched.slice(0, r.count + 1).map((f) => ({ ...f, mealType: r.mealType }));
        }),
      );
      const seenUrls = new Set<string>();
      const items = perRequest.flat().filter((f) => !seenUrls.has(f.url) && seenUrls.add(f.url));
      found = await toPlanCandidates(userId, items);
      const poolTitles = new Set(pool.map((c) => c.title.toLowerCase()));
      found = found.filter((f) => !poolTitles.has(f.draft.title.toLowerCase()));
    } catch (e) {
      // Ohne Web-Treffer trotzdem versuchen, aus der Sammlung zu planen.
      await logGenerationFailure(userId, "plan", e, FIND_PROMPT_VERSION);
    }
  }

  const candidates: PlanResult["candidates"] = [
    ...pool,
    ...found.map((f) => ({
      title: f.draft.title,
      cuisine: f.draft.cuisine,
      mealType: f.draft.mealType,
      portions: f.draft.portions,
      kcalPerPortion: f.draft.kcalPerPortion,
      proteinG: f.draft.proteinG,
      carbG: f.draft.carbG,
      fatG: f.draft.fatG,
      batchStorageDays: f.draft.batchStorageDays,
      ingredients: f.draft.ingredients,
      origin: "found" as const,
      recent: false,
      url: f.url,
      draft: f.draft,
    })),
  ];

  const mains = candidates.filter((c) => c.mealType === "main").length;
  const breakfasts = candidates.filter((c) => c.mealType === "breakfast").length;
  if (mains === 0 || breakfasts === 0) {
    throw new Error(
      `Zu wenige Rezepte für einen Plan (${mains} Hauptgerichte, ${breakfasts} Frühstücke) — die Web-Suche hat nichts Passendes geliefert. Importiere ein paar Rezepte per Link oder versuch es nochmal.`,
    );
  }

  const selection = await selectPlan({
    profile,
    candidates,
    dayRange: args.dayRange,
    snackPlan: args.snackPlan,
    sides: getSides(),
    claudeMemory: args.claudeMemory,
    lastFishGroups: args.lastFishGroups,
    useUpIngredients: args.useUpIngredients,
  });
  return { candidates, selection };
}

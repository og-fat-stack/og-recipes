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
import { FIND_PROMPT_VERSION, PLAN_PROMPT_VERSION } from "./ai/promptVersions";
import { findConstraintViolations } from "./ai/checkConstraints";
import { outOfSeason } from "./season";
import { ratingOk, type Rating } from "./recipeImport/rating";

/**
 * Wochenplan-Ablauf ohne von Claude erfundene Rezepte:
 *   1. Kandidaten aus der eigenen Sammlung holen.
 *   2. Fehlt etwas (zu wenige frische Gerichte/Frühstücke, kein passender
 *      Fisch, Zutat zum Aufbrauchen), per Web-Suche echte Rezepte finden,
 *      laden und mit dem BLS nachrechnen.
 *   3. Claude wählt aus, die App skaliert Portionen und ergänzt Beilagen.
 *
 * Harte Filter der App (nicht nur Bitte an Claude):
 *   - Saison: kein Rezept mit frischem Obst/Gemüse außerhalb der Saison
 *     (lib/season.ts) — weder aus der Sammlung noch aus dem Web.
 *   - Bewertung: Web-Rezepte nur mit ≥ 4 ★ aus ≥ 10 Stimmen
 *     (lib/recipeImport/rating.ts). Gemochte Rezepte (👍) bleiben immer drin.
 */

type PoolRecipe = PlanCandidate & { id: number };

export type PlanResult = {
  candidates: (PlanCandidate & {
    id?: number;
    url?: string;
    draft?: Candidate["draft"];
    rating?: Rating;
  })[];
  selection: PlanSelection;
};

/**
 * Rezepte, die für die Planung infrage kommen: nie abgelehnte, keine Snacks
 * oder Beilagen. Von Claude früher selbst erfundene Rezepte nur, wenn sie
 * gemocht wurden — alles andere (importiert, gefunden, von Hand) immer.
 * Dazu: nur saisonale Rezepte, und gefundene (nicht gemochte) Rezepte nicht,
 * wenn ihre gespeicherte Bewertung zu schwach oder zu selten ist.
 */
export async function getRecipePool(
  userId: number,
  recentTitles: Set<string>,
  month: number,
): Promise<PoolRecipe[]> {
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
    .filter(
      (r) =>
        r.liked ||
        !r.promptVersion?.startsWith("find") ||
        // Vor der Bewertungs-Speicherung gefunden: keine Daten, nicht raten.
        r.ratingCount == null ||
        ratingOk({ value: r.ratingValue ?? 0, count: r.ratingCount }),
    )
    .filter(
      (r) =>
        outOfSeason((r.ingredients as unknown as Ingredient[]) ?? [], r.portions, month).length === 0,
    )
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
  /** Monat des Plans (1–12) für die Saison. */
  month: number;
}): Promise<PlanResult> {
  const { userId, profile } = args;
  // Zeitmessung pro Phase ins Server-Log (Vercel-Limit: 300 s).
  const t0 = Date.now();
  const lap = (what: string) =>
    console.info(`[plan ${userId}] ${what}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const dayCount = args.dayRange.end - args.dayRange.start + 1;
  const recent = new Set(args.recentTitles);
  const pool = await getRecipePool(userId, recent, args.month);
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

  // Etwas Auswahl über das Minimum hinaus, damit Claude abwechseln kann —
  // und Puffer, weil Saison- und Bewertungsfilter einen Teil der Treffer
  // verwerfen.
  const mainsMissing = need.mains + 2 - freshMains.length - requests.length;
  if (mainsMissing > 0)
    requests.push({
      id: "haupt",
      mealType: "main",
      count: Math.min(6, mainsMissing),
      wish:
        "abwechslungsreiche, eiweißreiche Hauptgerichte aus verschiedenen Küchen (z. B. levantinisch, mediterran, indisch, ostasiatisch, mexikanisch) mit wechselnden Protein-Ankern (Hülsenfrüchte, Eier, Geflügel, Tofu); höchstens eins mit rotem Fleisch",
    });
  const breakfastsMissing = need.breakfasts + 1 - freshBreakfasts.length;
  if (breakfastsMissing > 0)
    requests.push({
      id: "fruehstueck",
      mealType: "breakfast",
      count: Math.min(3, breakfastsMissing),
      wish: "einfache, eiweißreiche Frühstücke mit 5–10 Minuten Aufwand (z. B. Quark- oder Skyr-Bowl, Rührei, Porridge, Omelett), deutlich verschieden voneinander",
    });

  // --- Web-Suche ----------------------------------------------------------
  const perMeal = perMealTarget(profile);
  // Titel, die schon in der Sammlung sind oder in einer Runde verworfen wurden.
  const avoidTitles = new Set(pool.map((c) => c.title));
  const poolTitles = new Set(pool.map((c) => c.title.toLowerCase()));

  /** Eine Suchrunde: Links suchen, laden, Bewertung + BLS + Saison prüfen. */
  const searchRound = async (reqs: SearchRequest[], round: number): Promise<Candidate[]> => {
    try {
      // Eine Web-Suche pro Auftrag, alle parallel — sonst summieren sich die
      // Suchen in einem einzigen langen Claude-Aufruf.
      const parts = await Promise.all(
        reqs.map((r) =>
          findRecipeUrls({
            requests: [r],
            vegetarian: profile.vegetarian,
            claudeMemory: args.claudeMemory,
            budgetConscious: profile.budgetConscious,
            perMeal,
            month: args.month,
            avoidTitles: [...avoidTitles],
          }).catch(async (e) => {
            await logGenerationFailure(userId, "plan", e, FIND_PROMPT_VERSION);
            return new Map<string, string[]>();
          }),
        ),
      );
      const urlsById = new Map(parts.flatMap((m) => [...m.entries()]));
      lap(`Web-Suche (Runde ${round})`);
      // Pro Suchauftrag laden (der Auftrag bestimmt Frühstück vs. Hauptgericht),
      // schwach oder selten bewertete verwerfen und höchstens count + 2
      // Treffer weiterverarbeiten (der Saison-Check danach siebt noch aus).
      let fetchedCount = 0;
      const perRequest = await Promise.all(
        reqs.map(async (r) => {
          const fetched = await fetchRecipes(urlsById.get(r.id) ?? []);
          fetchedCount += fetched.length;
          for (const f of fetched) {
            avoidTitles.add(f.recipe.name);
            if (!ratingOk(f.recipe.rating))
              console.info(
                `[plan ${userId}] Bewertung zu schwach/selten: "${f.recipe.name}" (${f.recipe.rating ? `${f.recipe.rating.value} ★, ${f.recipe.rating.count}` : "keine"})`,
              );
          }
          return fetched
            .filter((f) => ratingOk(f.recipe.rating))
            .slice(0, r.count + 2)
            .map((f) => ({ ...f, mealType: r.mealType }));
        }),
      );
      const seenUrls = new Set<string>();
      const items = perRequest.flat().filter((f) => !seenUrls.has(f.url) && seenUrls.add(f.url));
      const analyzed = await toPlanCandidates(userId, items);
      const seasonal = analyzed.filter((f) => {
        const off = outOfSeason(f.draft.ingredients, f.draft.portions, args.month);
        if (off.length)
          console.info(`[plan ${userId}] nicht saisonal: "${f.draft.title}" (${off.join(", ")})`);
        return off.length === 0;
      });
      lap(
        `Runde ${round}: ${fetchedCount} Seiten geladen, ${items.length} gut bewertet, ${analyzed.length} mit BLS-Werten, ${seasonal.length} saisonal`,
      );
      return seasonal.filter((f) => !poolTitles.has(f.draft.title.toLowerCase()));
    } catch (e) {
      // Ohne Web-Treffer trotzdem versuchen, aus der Sammlung zu planen.
      await logGenerationFailure(userId, "plan", e, FIND_PROMPT_VERSION);
      return [];
    }
  };

  let found: Candidate[] = requests.length > 0 ? await searchRound(requests, 1) : [];

  // Saison- und Bewertungsfilter werfen viel weg — reicht es nicht für den
  // Bereich (ein Rezept belegt höchstens 3 Mahlzeiten), gezielt nachsuchen.
  const minMains = Math.max(need.mains + 1, Math.ceil((dayCount * 2) / 3));
  const haveMains = freshMains.length + found.filter((f) => f.draft.mealType === "main").length;
  const haveBreakfasts =
    freshBreakfasts.length + found.filter((f) => f.draft.mealType === "breakfast").length;
  const retry: SearchRequest[] = [];
  if (haveMains < minMains)
    retry.push({
      id: "haupt2",
      mealType: "main",
      count: Math.min(6, minMains - haveMains + 1),
      wish:
        "eiweißreiche Hauptgerichte mit Wintergemüse der Saison (Kohl, Kürbis, Lauch, Wurzelgemüse, Linsen, Kichererbsen) und Protein-Anker wie Hähnchen, Eier, Tofu oder Hülsenfrüchte",
    });
  if (haveBreakfasts < need.breakfasts)
    retry.push({
      id: "fruehstueck2",
      mealType: "breakfast",
      count: Math.min(3, need.breakfasts - haveBreakfasts + 1),
      wish: "einfache, eiweißreiche Frühstücke mit 5–10 Minuten Aufwand, ohne frisches Sommerobst (z. B. Quark mit Apfel oder Birne, Rührei, Porridge, Omelett)",
    });
  if (retry.length > 0) found = [...found, ...(await searchRound(retry, 2))];

  const allCandidates: PlanResult["candidates"] = [
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
      rating: f.rating,
    })),
  ];

  // Einschränkungen (Memory, vegetarisch) in einem eigenen Schritt prüfen —
  // bei der Auswahl selbst rutschen Verstöße sonst durch.
  let candidates = allCandidates;
  try {
    const violations = await findConstraintViolations({
      recipes: allCandidates,
      vegetarian: profile.vegetarian,
      claudeMemory: args.claudeMemory,
    });
    candidates = allCandidates.filter((_, i) => !violations.has(i));
    lap(
      `Einschränkungen geprüft, ${violations.size} aussortiert${violations.size ? `: ${[...violations.keys()].map((i) => `"${allCandidates[i].title}"`).join(", ")}` : ""}`,
    );
  } catch (e) {
    await logGenerationFailure(userId, "plan", e, PLAN_PROMPT_VERSION);
  }

  const mains = candidates.filter((c) => c.mealType === "main").length;
  const breakfasts = candidates.filter((c) => c.mealType === "breakfast").length;
  if (mains === 0 || breakfasts === 0) {
    throw new Error(
      `Zu wenige Rezepte für einen Plan (${mains} Hauptgerichte, ${breakfasts} Frühstücke) — die Web-Suche hat nichts Passendes (saisonal, gut und oft bewertet) geliefert. Importiere ein paar Rezepte per Link oder versuch es nochmal.`,
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
  lap("Auswahl + Portionen");
  return { candidates, selection };
}

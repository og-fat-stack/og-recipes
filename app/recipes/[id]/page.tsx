import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getRecipe, type Ingredient } from "../../../lib/recipe";
import { planCookSessions } from "../../../lib/cookPlan";
import { DeleteRecipeButton } from "./DeleteRecipeButton";
import { CookedButton } from "./CookedButton";
import { LikeButtons } from "./LikeButtons";
import { FeedbackNote } from "./FeedbackNote";
import { RecomputeNutritionButton } from "./RecomputeNutritionButton";
import { MacroSourceNote } from "../../../components/MacroSourceNote";
import { getBlsFood } from "../../../lib/bls";

// "Mit BLS nachrechnen" ruft Claude zweimal auf.
export const maxDuration = 300;

/**
 * Umgerechnete Menge lesbar runden: g/ml auf ganze bzw. ab 100 auf 5er-Schritte,
 * sonst (Stück, EL, TL) Viertel unter 1, halbe bis 10, darüber ganz.
 */
function scaleQty(qty: number, f: number, unit?: string): string {
  const x = qty * f;
  const metric = unit === "g" || unit === "ml";
  const r = metric
    ? x >= 100
      ? Math.round(x / 5) * 5
      : Math.round(x)
    : x < 1
      ? Math.round(x * 4) / 4
      : x < 10
        ? Math.round(x * 2) / 2
        : Math.round(x);
  return (r || x).toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ portionen?: string }>;
}) {
  await connection();
  const userId = await requireUserId();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isFinite(recipeId)) notFound();
  const recipe = await getRecipe(userId, recipeId);
  if (!recipe) notFound();

  const ingredients = (recipe.ingredients as unknown as Ingredient[]) ?? [];
  // Aus dem Wochenplan verlinkt: Mengen auf die geplanten Portionen umrechnen.
  const wanted = Number((await searchParams).portionen);
  const scale =
    Number.isFinite(wanted) && wanted > 0 && Math.abs(wanted - recipe.portions) > 0.01
      ? wanted / recipe.portions
      : null;
  const steps = (recipe.steps as unknown as string[]) ?? [];
  const techniques = (recipe.techniques as unknown as string[]) ?? [];
  const cookPlan = planCookSessions({ portions: recipe.portions, ingredients });
  const nutritionRows = ingredients
    .filter((ing) => ing.grams != null && ing.grams > 0)
    .map((ing) => ({
      name: ing.name,
      grams: ing.grams,
      blsName: ing.bls ? getBlsFood(ing.bls)?.name : undefined,
    }));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/recipes"
          className="text-sm text-ink-subtle hover:underline"
        >
          ← Rezepte
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {recipe.title}
            </h1>
            <p className="mt-1 text-ink-muted">
              {recipe.cuisine} · {recipe.portions} Portionen · hält{" "}
              {recipe.batchStorageDays} Tage
            </p>
            {recipe.sourceUrl && (
              <p className="mt-1 text-sm text-ink-subtle">
                Quelle:{" "}
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {hostname(recipe.sourceUrl)}
                </a>
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <LikeButtons recipeId={recipe.id} liked={recipe.liked} />
            <CookedButton recipeId={recipe.id} />
            <DeleteRecipeButton id={recipe.id} />
          </div>
        </div>
        {cookPlan.length > 1 && (
          <div className="rounded-card border border-warn-line bg-warn-surface p-3 text-sm text-warn-surface-ink">
            <p className="font-medium">
              Auf {cookPlan.length} Kochtage aufgeteilt
            </p>
            <p className="mt-1">
              Mit {cookPlan.reduce((n, e) => n + e.thighs, 0)} Hähnchenschenkeln
              passt das nicht in einen Durchgang (max. 3 gleichzeitig). „Fertig
              gekocht“ legt automatisch {cookPlan.length} Kochsessions an:
            </p>
            <ul className="mt-1 list-inside list-disc">
              {cookPlan.map((e) => (
                <li key={e.dayOffset}>
                  {e.dayOffset === 0 ? "Heute" : `Tag ${e.dayOffset + 1}`}:{" "}
                  {e.thighs} Schenkel schmoren → {e.portionsMade} Portionen
                </li>
              ))}
            </ul>
          </div>
        )}
        {techniques.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {techniques.map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-ink-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="text-sm font-medium text-ink-subtle">Pro Portion</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="kcal" value={recipe.kcalPerPortion.toString()} />
          <Stat label="Eiweiß" value={`${recipe.proteinG} g`} />
          <Stat label="Kohlenhydrate" value={`${recipe.carbG} g`} />
          <Stat label="Fett" value={`${recipe.fatG} g`} />
        </div>
        <div className="mt-3 space-y-2">
          <MacroSourceNote
            macroSource={recipe.macroSource}
            macroCoverage={recipe.macroCoverage}
          />
          {!recipe.macroSource && (
            <RecomputeNutritionButton recipeId={recipe.id} />
          )}
          {recipe.macroSource && nutritionRows.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-ink-muted">
                Rechenweg je Zutat
              </summary>
              <ul className="mt-2 divide-y divide-line">
                {nutritionRows.map((row, i) => (
                  <li key={i} className="flex justify-between gap-3 py-1.5">
                    <span>
                      {row.name}
                      <span className="block text-xs text-ink-subtle">
                        {row.blsName ?? "nicht im BLS, geschätzt"}
                      </span>
                    </span>
                    <span className="shrink-0 text-ink-subtle">
                      ≈ {row.grams} g
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-subtle">Zutaten</h2>
        {scale && (
          <p className="mb-2 rounded-card border border-warn-line bg-warn-surface p-3 text-sm text-warn-surface-ink">
            Für deinen Wochenplan umgerechnet auf{" "}
            {wanted.toLocaleString("de-DE", { maximumFractionDigits: 2 })}{" "}
            Portionen (das Originalrezept ist für {recipe.portions}). Die Mengen
            in den Schritten gelten für das Original — nimm jeweils das{" "}
            {scale.toLocaleString("de-DE", { maximumFractionDigits: 2 })}-Fache.
          </p>
        )}
        <ul className="divide-y divide-line rounded-card border border-line">
          {ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between px-4 py-2 text-sm"
            >
              <span>{ing.name}</span>
              {(ing.qty != null || ing.unit) && (
                <span className="text-ink-subtle">
                  {ing.qty != null && scale ? scaleQty(ing.qty, scale, ing.unit) : (ing.qty ?? "")}{" "}
                  {ing.unit ?? ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-subtle">Schritte</h2>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-contrast text-xs font-semibold text-on-contrast">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-ink-subtle">
          Notiz nach dem Kochen
        </h2>
        <FeedbackNote recipeId={recipe.id} note={recipe.feedbackNote} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

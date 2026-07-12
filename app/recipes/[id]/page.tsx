import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { getRecipe, type Ingredient } from "../../../lib/recipe";
import { planCookSessions } from "../../../lib/cookPlan";
import { DeleteRecipeButton } from "./DeleteRecipeButton";
import { CookedButton } from "./CookedButton";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const userId = await requireUserId();
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isFinite(recipeId)) notFound();
  const recipe = await getRecipe(userId, recipeId);
  if (!recipe) notFound();

  const ingredients = (recipe.ingredients as unknown as Ingredient[]) ?? [];
  const steps = (recipe.steps as unknown as string[]) ?? [];
  const techniques = (recipe.techniques as unknown as string[]) ?? [];
  const cookPlan = planCookSessions({ portions: recipe.portions, ingredients });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/recipes"
          className="text-sm text-ink-subtle hover:underline"
        >
          ← Rezepte
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {recipe.title}
            </h1>
            <p className="mt-1 text-ink-muted">
              {recipe.cuisine} · {recipe.portions} Portionen · hält{" "}
              {recipe.batchStorageDays} Tage
            </p>
          </div>
          <div className="flex items-center gap-2">
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
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-subtle">Zutaten</h2>
        <ul className="divide-y divide-line rounded-card border border-line">
          {ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between px-4 py-2 text-sm"
            >
              <span>{ing.name}</span>
              {(ing.qty != null || ing.unit) && (
                <span className="text-ink-subtle">
                  {ing.qty ?? ""} {ing.unit ?? ""}
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

      {recipe.notes && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-subtle">Notizen</h2>
          <p className="text-sm whitespace-pre-wrap">{recipe.notes}</p>
        </section>
      )}
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

import Link from "next/link";
import { connection } from "next/server";
import { requireUserId } from "../../lib/auth";
import { getRecipes } from "../../lib/recipe";
import { LikeButtons } from "./[id]/LikeButtons";

export default async function RecipesPage() {
  await connection();
  const userId = await requireUserId();
  const recipes = await getRecipes(userId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Rezepte</h1>
          <p className="mt-1 text-ink-muted">
            Dein persönliches Kochbuch. Meal-Prep-tauglich und makro-getrackt.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/recipes/generate"
            className="flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            ✨ Mit KI
          </Link>
          <Link
            href="/recipes/new"
            className="flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-contrast px-4 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover"
          >
            + Neues Rezept
          </Link>
        </div>
      </header>

      {recipes.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong p-8 text-center">
          <p className="text-ink-muted">
            Noch keine Rezepte. Füge eins hinzu oder starte{" "}
            <code className="rounded-control bg-surface-subtle px-1">
              npm run db:seed
            </code>{" "}
            für ein Starter-Set.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {recipes.map((r) => {
            const techniques = (r.techniques as unknown as string[]) ?? [];
            return (
              <li
                key={r.id}
                className="rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-active"
              >
                <Link href={`/recipes/${r.id}`} className="block space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium">{r.title}</h2>
                    <span className="shrink-0 text-xs text-ink-subtle">
                      {r.cuisine}
                    </span>
                  </div>
                  <div className="text-sm text-ink-muted">
                    {r.kcalPerPortion} kcal · {r.proteinG}E · {r.carbG}K ·{" "}
                    {r.fatG}F · {r.portions} Portionen
                  </div>
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
                </Link>
                <div className="mt-3 border-t border-line pt-3">
                  <LikeButtons recipeId={r.id} liked={r.liked} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { getRecipes } from "../../lib/recipe";

export default async function RecipesPage() {
  await connection();
  const recipes = await getRecipes();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Rezepte</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Dein persönliches Kochbuch. Meal-Prep-tauglich und makro-getrackt.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/recipes/generate"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ✨ Mit KI
          </Link>
          <Link
            href="/recipes/new"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            + Neues Rezept
          </Link>
        </div>
      </header>

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Noch keine Rezepte. Füge eins hinzu oder starte{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
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
                className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <Link href={`/recipes/${r.id}`} className="block space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium">{r.title}</h2>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {r.cuisine}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {r.kcalPerPortion} kcal · {r.proteinG}E · {r.carbG}K ·{" "}
                    {r.fatG}F · {r.portions} Portionen
                  </div>
                  {techniques.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {techniques.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

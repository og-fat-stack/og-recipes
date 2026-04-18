import Link from "next/link";
import { getRecentReflections } from "../../lib/reflection";
import type { ReflectionNotes } from "../../lib/ai/summarizeReflection";

export default async function HistoryPage() {
  const reflections = await getRecentReflections(30);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Verlauf</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Deine Kochsessions und Reflexionen. Claude nutzt diese, um den
          Wochenplan zu verbessern.
        </p>
      </header>

      {reflections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Noch keine Reflexionen. Klick auf einem Rezept „✅ Fertig gekocht"
            und gib kurz Feedback.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reflections.map((r) => {
            const notes = r.claudeNotes as unknown as ReflectionNotes;
            return (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/recipes/${r.cookSession.recipeId}`}
                      className="font-medium hover:underline"
                    >
                      {r.cookSession.recipe.title}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {r.cookSession.date.toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div className="text-amber-500" title={`${r.rating}/5`}>
                    {"★".repeat(r.rating)}
                    <span className="text-zinc-300 dark:text-zinc-700">
                      {"★".repeat(5 - r.rating)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {notes.summary}
                </p>
                {notes.nextTimeTry.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Nächstes Mal
                    </div>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {notes.nextTimeTry.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

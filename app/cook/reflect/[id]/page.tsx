import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../lib/db";
import type { ReflectionNotes } from "../../../../lib/ai/summarizeReflection";
import { ReflectForm } from "./ReflectForm";

export default async function ReflectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) notFound();

  const session = await db.cookSession.findUnique({
    where: { id: sessionId },
    include: { recipe: true, reflection: true },
  });
  if (!session) notFound();

  const notes = session.reflection?.claudeNotes as
    | ReflectionNotes
    | undefined;

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/recipes/${session.recipeId}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← {session.recipe.title}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Reflexion
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Kurzes Feedback hilft Claude, den nächsten Wochenplan zu verbessern.
        </p>
      </header>

      {saved && notes && (
        <section className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="font-medium text-emerald-800 dark:text-emerald-200">
            Gespeichert — hier die Zusammenfassung:
          </div>
          <p>{notes.summary}</p>
          {notes.techniqueTakeaways.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Was du gelernt hast
              </div>
              <ul className="mt-1 list-disc pl-5">
                {notes.techniqueTakeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {notes.nextTimeTry.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Nächstes Mal probieren
              </div>
              <ul className="mt-1 list-disc pl-5">
                {notes.nextTimeTry.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <ReflectForm sessionId={sessionId} />
    </div>
  );
}

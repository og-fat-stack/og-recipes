import Link from "next/link";
import {
  CONTEXT_LABELS,
  DAYS,
  FOCUS_LABELS,
  addDays,
  getCurrentTrainingPlan,
  weekStart,
  type ExerciseEntry,
  type TrainingContext,
  type TrainingFocus,
} from "../../lib/training";
import { getProfile } from "../../lib/profile";
import { GenerateTrainingButton } from "./GenerateTrainingButton";

function fmtDate(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default async function TrainingPage() {
  const [profile, plan] = await Promise.all([
    getProfile(),
    getCurrentTrainingPlan(),
  ]);
  const ws = weekStart();

  const sessionByDay = new Map<number, NonNullable<typeof plan>["sessions"][number]>();
  if (plan) {
    for (const s of plan.sessions) sessionByDay.set(s.day, s);
  }

  const totalKcal =
    plan?.sessions.reduce((s, x) => s + x.kcalEstimate, 0) ?? 0;
  const totalMin =
    plan?.sessions.reduce((s, x) => s + x.durationMin, 0) ?? 0;
  const dailyBump = Math.round(totalKcal / 7);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Trainingsplan
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Woche vom {fmtDate(ws)} bis {fmtDate(addDays(ws, 6))}. Nachhaltig,
            evidenzbasiert, mit Ruhetagen.
          </p>
        </div>
        {profile && <GenerateTrainingButton hasPlan={!!plan} />}
      </header>

      {!profile && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          Zuerst <Link href="/profile" className="underline">Profil</Link>{" "}
          ausfüllen, damit Claude Volumen und Frequenz richtig wählen kann.
        </div>
      )}

      {profile && !plan && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Noch kein Trainingsplan für diese Woche. Klick oben auf „Woche
            generieren&ldquo;.
          </p>
        </div>
      )}

      {plan && (
        <>
          {plan.notes && (
            <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Methodik & Ruhetage
              </h2>
              <p className="whitespace-pre-wrap">{plan.notes}</p>
            </aside>
          )}

          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="Sessions" value={`${plan.sessions.length}`} />
            <Stat label="Gesamtdauer" value={`${totalMin} min`} />
            <Stat
              label="Wochen-kcal"
              value={`${totalKcal}`}
              sub={`+${dailyBump} kcal/Tag im Eat-Plan`}
            />
          </section>

          <ul className="space-y-3">
            {DAYS.map((label, day) => {
              const session = sessionByDay.get(day);
              const date = fmtDate(addDays(ws, day));
              return (
                <li
                  key={day}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {label} {date}
                      </span>
                      {session ? (
                        <h3 className="mt-0.5 text-base font-semibold">
                          {session.name}
                        </h3>
                      ) : (
                        <h3 className="mt-0.5 text-base font-medium text-zinc-500">
                          Ruhetag
                        </h3>
                      )}
                    </div>
                    {session && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <ContextChip context={session.context as TrainingContext} />
                        <FocusChip focus={session.focus as TrainingFocus} />
                        <span className="text-zinc-500">
                          {session.durationMin} min · {session.kcalEstimate} kcal
                        </span>
                      </div>
                    )}
                  </div>

                  {session && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                        Übungen anzeigen ({(session.exercises as ExerciseEntry[]).length})
                      </summary>
                      <ol className="mt-3 space-y-2 text-sm">
                        {(session.exercises as ExerciseEntry[]).map((ex, i) => (
                          <li
                            key={i}
                            className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="font-medium">{ex.name}</span>
                              <span className="text-xs text-zinc-500">
                                {ex.sets} × {ex.reps} · Pause {ex.restSec}s
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              Equipment: {ex.equipment}
                              {ex.notes ? ` · ${ex.notes}` : ""}
                            </div>
                          </li>
                        ))}
                      </ol>
                      {session.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-500">
                          {session.notes}
                        </p>
                      )}
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </h2>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function ContextChip({ context }: { context: TrainingContext }) {
  const cls =
    context === "gym"
      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {CONTEXT_LABELS[context]}
    </span>
  );
}

function FocusChip({ focus }: { focus: TrainingFocus }) {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      {FOCUS_LABELS[focus]}
    </span>
  );
}

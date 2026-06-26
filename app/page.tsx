import Link from "next/link";
import { connection } from "next/server";
import { getProfile } from "../lib/profile";
import { getTodayChecklist } from "../lib/checklist";
import { getRoutines } from "../lib/routines";
import { TodayChecklist } from "./TodayChecklist";

export default async function Home() {
  await connection();
  const profile = await getProfile();
  const [checklist, routines] = await Promise.all([
    getTodayChecklist(),
    getRoutines(profile),
  ]);

  const todayLabel = checklist.dateKey.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  });

  const allDone = checklist.doneCount === checklist.total;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Heute</h1>
          <span className="text-sm text-zinc-500">{todayLabel}</span>
        </div>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {allDone
            ? "Alles erledigt — stark. 💪"
            : `${checklist.doneCount} von ${checklist.total} erledigt`}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{
              width: `${(checklist.doneCount / checklist.total) * 100}%`,
            }}
          />
        </div>
      </header>

      <TodayChecklist items={checklist.items} />

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-zinc-500">Routinen</h2>
          {routines.some((r) => r.due) && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {routines.filter((r) => r.due).length} fällig
            </span>
          )}
        </div>
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {routines.map((r) => (
            <li key={r.key}>
              <Link
                href={r.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span
                  className={
                    "h-2 w-2 shrink-0 rounded-full " +
                    (r.due ? "bg-amber-500" : "bg-emerald-500")
                  }
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-xs text-zinc-500">
                    {r.cadence} · {r.status}
                  </span>
                </span>
                <span
                  className={
                    "ml-auto text-xs " +
                    (r.due
                      ? "font-medium text-amber-600 dark:text-amber-400"
                      : "text-zinc-400")
                  }
                >
                  {r.due ? "fällig →" : "→"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!profile && (
        <p className="text-sm text-zinc-500">
          Tipp: Leg dein{" "}
          <Link href="/profile" className="underline">
            Profil
          </Link>{" "}
          an, damit Kalorien-, Eiweiß- und Wasserziele konkret angezeigt werden.
        </p>
      )}
    </div>
  );
}

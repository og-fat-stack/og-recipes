import { connection } from "next/server";
import {
  getStepEntries,
  getStepStats,
  STEP_GOAL_MIN,
  STEP_GOAL_MAX,
} from "../../lib/steps";
import {
  WEEKLY_PLAN,
  KIND_META,
  weeklyActiveMinutes,
} from "../../lib/training";
import { StepForm } from "./StepForm";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("de-DE") : "—";
}
function fmtSteps(n: number | null) {
  return n == null ? "—" : n.toLocaleString("de-DE");
}
/** Grobe Gehzeit: ~10 Min pro 1.000 Schritte (normales Tempo). */
function walkMinutes(steps: number): number {
  return Math.round((steps / 1000) * 10);
}

function berlinTodayIndex(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
}

export default async function TrainingPage() {
  await connection();
  const stats = await getStepStats();
  const entries = await getStepEntries(14);
  const todayIdx = berlinTodayIndex();
  const todayPlan = WEEKLY_PLAN[todayIdx];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Training</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Wochenplan für den Cut: 3× Kraft hält die Muskeln im Defizit, 2×
          lockeres Cardio, und täglich {STEP_GOAL_MIN.toLocaleString("de-DE")}–
          {STEP_GOAL_MAX.toLocaleString("de-DE")} Schritte als größter Hebel
          gegen Bauchfett. Gezieltes „Bauch-Wegtrainieren“ gibt es nicht — Fett
          geht übers Defizit.
        </p>
      </header>

      {/* ---- Schritte-Tracker ---- */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Schritte</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Heute"
            value={fmtSteps(stats.todaySteps)}
            sub={
              stats.todaySteps != null
                ? `≈ ${walkMinutes(stats.todaySteps)} Min Gehen`
                : "noch nicht eingetragen"
            }
            tone={
              stats.todaySteps == null
                ? undefined
                : stats.todaySteps >= STEP_GOAL_MIN
                  ? "good"
                  : "warn"
            }
          />
          <Stat
            label="7-Tage-Schnitt"
            value={fmtSteps(stats.rollingAvg7 != null ? Math.round(stats.rollingAvg7) : null)}
            tone={
              stats.rollingAvg7 == null
                ? undefined
                : stats.rollingAvg7 >= STEP_GOAL_MIN
                  ? "good"
                  : "warn"
            }
          />
          <Stat
            label="Ziel-Tage (7 T.)"
            value={`${stats.goalDays7}/${stats.loggedDays7 || 0}`}
            sub={`≥ ${STEP_GOAL_MIN.toLocaleString("de-DE")} Schritte`}
          />
          <Stat
            label="Letzter Eintrag"
            value={fmtSteps(stats.latestSteps)}
            sub={fmtDate(stats.latestDate)}
          />
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-200">
          Faustregel: ~10 Min Gehen ≈ 1.000 Schritte. Dein Tagesziel von{" "}
          {STEP_GOAL_MIN.toLocaleString("de-DE")}–
          {STEP_GOAL_MAX.toLocaleString("de-DE")} Schritten entspricht also rund{" "}
          <strong>80–100 Min Gehen</strong> — über den Tag verteilt (Arbeitsweg,
          Spaziergang nach dem Essen).
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-500">
            Schritte eintragen
          </h3>
          <StepForm defaultSteps={stats.todaySteps ?? undefined} />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-500">
            Verlauf (14 Tage)
          </h3>
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Einträge.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Schritte</th>
                    <th className="px-3 py-2">Ziel</th>
                    <th className="px-3 py-2">Notiz</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      className="border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <td className="px-3 py-2">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2 font-medium">
                        {fmtSteps(e.steps)}
                      </td>
                      <td className="px-3 py-2">
                        <GoalChip steps={e.steps} />
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {e.note ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ---- Wochenplan ---- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">Wochenplan</h2>
          <span className="text-sm text-zinc-500">
            {Math.round(weeklyActiveMinutes() / 5) * 5} Min aktive Zeit/Woche +
            täglich Schritte
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEEKLY_PLAN.map((d) => {
            const meta = KIND_META[d.kind];
            const isToday = d.day === todayIdx;
            return (
              <div
                key={d.day}
                className={
                  "rounded-xl border p-4 " +
                  (isToday
                    ? "border-zinc-900 bg-white shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900")
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{d.label}</span>
                    {isToday && (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                        heute
                      </span>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${meta.chip}`}>
                    {meta.emoji} {meta.label}
                  </span>
                </div>
                <p className="mt-2 font-medium">{d.title}</p>
                {d.durationMin > 0 && (
                  <p className="text-xs text-zinc-500">
                    ca. {d.durationMin} Min
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {d.items.map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-zinc-400">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {todayPlan && (
          <p className="text-sm text-zinc-500">
            Heute dran: <strong>{todayPlan.title}</strong> ({KIND_META[todayPlan.kind].label}).
          </p>
        )}
      </section>
    </div>
  );
}

function GoalChip({ steps }: { steps: number }) {
  const status =
    steps >= STEP_GOAL_MIN ? "green" : steps >= STEP_GOAL_MIN * 0.75 ? "amber" : "red";
  const cls =
    status === "green"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : status === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
  const label =
    status === "green" ? "Ziel erreicht" : status === "amber" ? "fast" : "drunter";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

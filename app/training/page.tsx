import Link from "next/link";
import { connection } from "next/server";
import { STEP_GOAL_MIN, STEP_GOAL_MAX } from "../../lib/steps";
import {
  KIND_META,
  PLAN_VARIANTS,
  resolvePlanVariant,
  weeklyActiveMinutes,
} from "../../lib/training";
import { requireUserId } from "../../lib/auth";

function berlinTodayIndex(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  await connection();
  await requireUserId();
  const todayIdx = berlinTodayIndex();
  const variant = resolvePlanVariant((await searchParams).plan);
  const weeklyPlan = PLAN_VARIANTS[variant].plan;
  const todayPlan = weeklyPlan[todayIdx];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Training</h1>
        <p className="mt-1 text-ink-muted">
          Wochenplan für den Cut: 3× Kraft hält die Muskeln im Defizit, 2×
          lockeres Cardio, und täglich {STEP_GOAL_MIN.toLocaleString("de-DE")}–
          {STEP_GOAL_MAX.toLocaleString("de-DE")} Schritte als größter Hebel
          gegen Bauchfett. Gezieltes „Bauch-Wegtrainieren“ gibt es nicht — Fett
          geht übers Defizit.
        </p>
      </header>

      {/* ---- Wochenplan ---- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">Wochenplan</h2>
          <span className="text-sm text-ink-subtle">
            {Math.round(weeklyActiveMinutes(weeklyPlan) / 5) * 5} Min aktive
            Zeit/Woche + täglich Schritte
          </span>
        </div>

        <div className="inline-flex rounded-full border border-line p-1">
          {(Object.keys(PLAN_VARIANTS) as (keyof typeof PLAN_VARIANTS)[]).map(
            (key) => {
              const active = key === variant;
              return (
                <Link
                  key={key}
                  href={key === "home" ? "/training" : `/training?plan=${key}`}
                  scroll={false}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                    (active
                      ? "bg-contrast text-on-contrast"
                      : "text-ink-muted hover:text-ink")
                  }
                >
                  {PLAN_VARIANTS[key].short}
                </Link>
              );
            },
          )}
        </div>

        <p className="text-sm text-ink-subtle">
          {variant === "home"
            ? "Alles zu Hause machbar — überwiegend reines Körpergewicht. Für die Zug-Übungen reicht ein stabiler Tisch; optional Türreck oder Widerstandsband."
            : "Klassische Gym-Variante mit freien Gewichten, Maschinen und Laufband."}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weeklyPlan.map((d) => {
            const meta = KIND_META[d.kind];
            const isToday = d.day === todayIdx;
            return (
              <div
                key={d.day}
                className={
                  "rounded-card border p-4 " +
                  (isToday
                    ? "border-contrast bg-surface shadow-sm"
                    : "border-line bg-surface")
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{d.label}</span>
                    {isToday && (
                      <span className="rounded-full bg-contrast px-2 py-0.5 text-xs text-on-contrast">
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
                  <p className="text-xs text-ink-subtle">
                    ca. {d.durationMin} Min
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                  {d.items.map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ink-subtle">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {todayPlan && (
          <p className="text-sm text-ink-subtle">
            Heute dran: <strong>{todayPlan.title}</strong> ({KIND_META[todayPlan.kind].label}).
          </p>
        )}
      </section>
    </div>
  );
}

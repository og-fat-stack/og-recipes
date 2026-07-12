import Link from "next/link";
import { connection } from "next/server";
import { requireUserId } from "../lib/auth";
import { getProfile } from "../lib/profile";
import { getTodayChecklist } from "../lib/checklist";
import { getRoutines } from "../lib/routines";
import { planActivityKcalPerDay } from "../lib/training";
import { ActivityToggle } from "../components/ActivityToggle";
import { TodayChecklist } from "./TodayChecklist";

export default async function Home() {
  await connection();
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const [checklist, routines] = await Promise.all([
    getTodayChecklist(userId),
    getRoutines(userId, profile),
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
          <span className="text-sm text-ink-subtle">{todayLabel}</span>
        </div>
        <p className="mt-1 text-ink-muted">
          {allDone
            ? "Alles erledigt — stark. 💪"
            : `${checklist.doneCount} von ${checklist.total} erledigt`}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-inset">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${(checklist.doneCount / checklist.total) * 100}%`,
            }}
          />
        </div>
      </header>

      <TodayChecklist items={checklist.items} />

      {profile && (
        <ActivityToggle
          enabled={profile.activityEnabled}
          extraKcal={planActivityKcalPerDay(profile.weightKg)}
        />
      )}

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-ink-subtle">Routinen</h2>
          {routines.some((r) => r.due) && (
            <span className="text-xs text-warn-ink">
              {routines.filter((r) => r.due).length} fällig
            </span>
          )}
        </div>
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {routines.map((r) => (
            <li key={r.key}>
              <Link
                href={r.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover"
              >
                <span
                  className={
                    "h-2 w-2 shrink-0 rounded-full " +
                    (r.due ? "bg-warn" : "bg-accent")
                  }
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-xs text-ink-subtle">
                    {r.cadence} · {r.status}
                  </span>
                </span>
                <span
                  className={
                    "ml-auto text-xs " +
                    (r.due
                      ? "font-medium text-warn-ink"
                      : "text-ink-subtle")
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
        <p className="text-sm text-ink-subtle">
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

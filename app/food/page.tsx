import Link from "next/link";
import { connection } from "next/server";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import {
  dayParam,
  entryItems,
  getFoodEntriesForDay,
  parseDayParam,
  sumFoodEntries,
} from "../../lib/foodLog";
import { addDays, startOfDay } from "../../lib/time";
import { ProgressBar } from "../../components/ProgressBar";
import { FoodForm } from "./FoodForm";
import { deleteFoodEntry } from "./actions";

function fmtDay(d: Date) {
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await connection();
  const userId = await requireUserId();
  const day = parseDayParam((await searchParams).d);
  const today = startOfDay();
  const isToday = day.getTime() === today.getTime();

  const [profile, entries] = await Promise.all([
    getProfile(userId),
    getFoodEntriesForDay(userId, day),
  ]);
  const totals = sumFoodEntries(entries);

  const macros: {
    label: string;
    value: number;
    target: number | null;
    unit: string;
  }[] = [
    { label: "Kalorien", value: totals.kcal, target: profile?.kcalTarget ?? null, unit: "kcal" },
    { label: "Eiweiß", value: totals.proteinG, target: profile?.proteinG ?? null, unit: "g" },
    { label: "Kohlenhydrate", value: totals.carbG, target: profile?.carbG ?? null, unit: "g" },
    { label: "Fett", value: totals.fatG, target: profile?.fatG ?? null, unit: "g" },
  ];

  const kcalLeft = profile ? profile.kcalTarget - totals.kcal : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Essen</h1>
          <span className="text-sm text-ink-subtle">{fmtDay(day)}</span>
        </div>
        <p className="mt-1 text-ink-muted">
          Schreib einfach, was du gegessen hast — Claude schätzt Kalorien und
          Makros.
        </p>
      </header>

      <div className="flex items-center justify-between text-sm">
        <Link
          href={`/food?d=${dayParam(addDays(day, -1))}`}
          className="rounded-full border border-line-strong px-3 py-1.5 font-medium text-ink-muted transition-colors hover:bg-surface-subtle"
        >
          ← Vortag
        </Link>
        {!isToday && (
          <Link href="/food" className="text-accent-ink underline">
            Zu heute
          </Link>
        )}
        {!isToday ? (
          <Link
            href={`/food?d=${dayParam(addDays(day, 1))}`}
            className="rounded-full border border-line-strong px-3 py-1.5 font-medium text-ink-muted transition-colors hover:bg-surface-subtle"
          >
            Folgetag →
          </Link>
        ) : (
          <span className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-on-accent">
            Heute
          </span>
        )}
      </div>

      {profile ? (
        <section className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-ink-subtle">Tagesbilanz</h2>
            {kcalLeft != null && (
              <span
                className={
                  "text-xs " +
                  (kcalLeft < 0 ? "font-medium text-warn-ink" : "text-ink-subtle")
                }
              >
                {kcalLeft >= 0
                  ? `noch ${kcalLeft} kcal übrig`
                  : `${-kcalLeft} kcal über dem Ziel`}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {macros.map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-muted">{m.label}</span>
                  <span className="font-semibold tabular-nums">
                    {m.value}
                    {m.target != null && (
                      <span className="font-normal text-ink-subtle">
                        {" "}
                        / {m.target} {m.unit}
                      </span>
                    )}
                  </span>
                </div>
                {m.target != null && (
                  <ProgressBar
                    value={m.value}
                    max={m.target}
                    size="sm"
                    label={`${m.label}: ${m.value} von ${m.target} ${m.unit}`}
                    className="mt-1.5"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-card border border-dashed border-line-strong p-4 text-sm">
          Zuerst{" "}
          <Link href="/profile" className="underline">
            Profil
          </Link>{" "}
          ausfüllen, um die Tagesbilanz gegen deine Ziele zu sehen.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-subtle">
          {isToday ? "Was hast du gegessen?" : `Nachtragen für ${fmtDay(day)}`}
        </h2>
        <FoodForm dateParam={dayParam(day)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-subtle">Einträge</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-subtle">
            Noch nichts eingetragen{isToday ? " — guten Appetit!" : "."}
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const items = entryItems(e.items);
              return (
                <li
                  key={e.id}
                  className="rounded-card border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{e.text}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle">
                        {fmtTime(e.createdAt)} Uhr
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-ink-subtle">
                      <span className="block text-sm font-semibold text-ink">
                        {e.kcal} kcal
                      </span>
                      <span className="block">
                        {e.proteinG} E · {e.carbG} K · {e.fatG} F
                      </span>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-ink-muted">
                      {items.map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">
                            {it.name}{" "}
                            <span className="text-ink-subtle">
                              ({it.portion})
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {Math.round(it.kcal)} kcal · {Math.round(it.proteinG)} g E
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex items-end justify-between gap-3">
                    {e.assumptions ? (
                      <p className="text-xs italic text-ink-subtle">
                        Annahme: {e.assumptions}
                      </p>
                    ) : (
                      <span />
                    )}
                    <form action={deleteFoodEntry} className="shrink-0">
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="rounded-full px-2.5 py-1 text-xs text-ink-subtle transition-colors hover:bg-surface-subtle hover:text-danger-ink"
                      >
                        Löschen
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

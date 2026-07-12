import Link from "next/link";
import { connection } from "next/server";
import {
  DAYS,
  SLOT_LABELS,
  SLOTS,
  addDays,
  getPlanForWeek,
  parseWeekSel,
  weekStartFor,
} from "../../lib/plan";
import { berlinWeekdayIndex } from "../../lib/time";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import { GeneratePlanButton } from "./GeneratePlanButton";

const WEEK_TABS = [
  { sel: "this" as const, label: "Diese Woche", href: "/plan" },
  { sel: "next" as const, label: "Nächste Woche", href: "/plan?week=next" },
];

function fmtDate(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await connection();
  const userId = await requireUserId();
  const week = parseWeekSel((await searchParams).week);
  const ws = weekStartFor(week);
  const [profile, plan] = await Promise.all([
    getProfile(userId),
    getPlanForWeek(userId, ws),
  ]);
  // In der laufenden Woche werden vergangene Tage nicht (mehr) verplant.
  const minDay = week === "this" ? berlinWeekdayIndex() : 0;

  // Build a 7×2 grid keyed by `${day}-${slot}`.
  const grid = new Map<
    string,
    { recipeId: number; title: string; kcal: number; protein: number; carb: number; fat: number }
  >();
  if (plan) {
    for (const m of plan.meals) {
      grid.set(`${m.day}-${m.slot}`, {
        recipeId: m.recipeId,
        title: m.recipe.title,
        kcal: m.recipe.kcalPerPortion,
        protein: m.recipe.proteinG,
        carb: m.recipe.carbG,
        fat: m.recipe.fatG,
      });
    }
  }

  // Daily totals.
  const dailyTotals = DAYS.map((_, day) => {
    const cells = SLOTS.map((s) => grid.get(`${day}-${s}`)).filter(Boolean) as {
      kcal: number;
      protein: number;
      carb: number;
      fat: number;
    }[];
    return {
      kcal: cells.reduce((s, c) => s + c.kcal, 0),
      protein: cells.reduce((s, c) => s + c.protein, 0),
      carb: cells.reduce((s, c) => s + c.carb, 0),
      fat: cells.reduce((s, c) => s + c.fat, 0),
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wochenplan</h1>
          <p className="mt-1 text-ink-muted">
            Woche vom {fmtDate(ws)} bis {fmtDate(addDays(ws, 6))}. Gekocht wird
            Mo / Mi / Fr in 3 Batches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plan && (
            <Link
              href={week === "next" ? "/plan/shopping?week=next" : "/plan/shopping"}
              className="rounded-full border border-line-strong px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-subtle"
            >
              🛒 Einkaufsliste
            </Link>
          )}
          {profile && (
            <GeneratePlanButton hasPlan={!!plan} week={week} minDay={minDay} />
          )}
        </div>
      </header>

      <div className="inline-flex rounded-full border border-line p-1">
        {WEEK_TABS.map((t) => {
          const active = t.sel === week;
          return (
            <Link
              key={t.sel}
              href={t.href}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition " +
                (active
                  ? "bg-contrast text-on-contrast"
                  : "text-ink-muted hover:text-ink")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {!profile && (
        <div className="rounded-card border border-dashed border-line-strong p-4 text-sm">
          Zuerst <Link href="/profile" className="underline">Profil</Link>{" "}
          ausfüllen, damit Claude die Makros pro Mahlzeit berechnen kann.
        </div>
      )}

      {profile && !plan && (
        <div className="rounded-card border border-dashed border-line-strong p-8 text-center">
          <p className="text-ink-muted">
            Noch kein Plan für {week === "next" ? "nächste" : "diese"} Woche.
            Klick oben auf „Woche generieren“.
          </p>
        </div>
      )}

      {plan && (
        <>
          {plan.notes && (
            <aside className="rounded-card border border-line bg-surface-page p-4 text-sm text-ink-muted">
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                Notizen zur Woche
              </h2>
              <p className="whitespace-pre-wrap">{plan.notes}</p>
            </aside>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface-page px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-ink-subtle">
                    Slot
                  </th>
                  {DAYS.map((d, i) => (
                    <th
                      key={d}
                      className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-ink-subtle"
                    >
                      {d} {fmtDate(addDays(ws, i))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="sticky left-0 bg-surface-page px-2 py-2 align-top text-xs font-medium text-ink-subtle">
                      {SLOT_LABELS[slot]}
                    </td>
                    {DAYS.map((_, day) => {
                      const cell = grid.get(`${day}-${slot}`);
                      return (
                        <td
                          key={day}
                          className="min-w-[140px] border border-line p-2 align-top"
                        >
                          {cell ? (
                            <Link
                              href={`/recipes/${cell.recipeId}`}
                              className="block space-y-1 hover:underline"
                            >
                              <div className="text-sm font-medium leading-snug">
                                {cell.title}
                              </div>
                              <div className="text-xs text-ink-subtle">
                                {cell.kcal} kcal · {cell.protein}E ·{" "}
                                {cell.carb}K · {cell.fat}F
                              </div>
                            </Link>
                          ) : (
                            <span className="text-xs text-ink-subtle">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 bg-surface-page px-2 py-2 text-xs font-medium text-ink-subtle">
                    Tagessumme
                  </td>
                  {dailyTotals.map((t, i) => (
                    <td
                      key={i}
                      className="border border-line p-2 text-xs"
                    >
                      <div className="font-semibold">{t.kcal} kcal</div>
                      <div className="text-ink-subtle">
                        {t.protein}E · {t.carb}K · {t.fat}F
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

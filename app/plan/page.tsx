import Link from "next/link";
import {
  DAYS,
  SLOT_LABELS,
  SLOTS,
  addDays,
  getCurrentPlan,
  weekStart,
} from "../../lib/plan";
import { getProfile } from "../../lib/profile";
import { GeneratePlanButton } from "./GeneratePlanButton";

function fmtDate(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default async function PlanPage() {
  const [profile, plan] = await Promise.all([getProfile(), getCurrentPlan()]);
  const ws = weekStart();

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
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Woche vom {fmtDate(ws)} bis {fmtDate(addDays(ws, 6))}. Gekocht wird
            Mo / Mi / Fr in 3 Batches.
          </p>
        </div>
        {profile && <GeneratePlanButton hasPlan={!!plan} />}
      </header>

      {!profile && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          Zuerst <Link href="/profile" className="underline">Profil</Link>{" "}
          ausfüllen, damit Claude die Makros pro Mahlzeit berechnen kann.
        </div>
      )}

      {profile && !plan && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            Noch kein Plan für diese Woche. Klick oben auf „Woche generieren".
          </p>
        </div>
      )}

      {plan && (
        <>
          {plan.notes && (
            <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Notizen zur Woche
              </h2>
              <p className="whitespace-pre-wrap">{plan.notes}</p>
            </aside>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-zinc-50 px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
                    Slot
                  </th>
                  {DAYS.map((d, i) => (
                    <th
                      key={d}
                      className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500"
                    >
                      {d} {fmtDate(addDays(ws, i))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="sticky left-0 bg-zinc-50 px-2 py-2 align-top text-xs font-medium text-zinc-500 dark:bg-zinc-950">
                      {SLOT_LABELS[slot]}
                    </td>
                    {DAYS.map((_, day) => {
                      const cell = grid.get(`${day}-${slot}`);
                      return (
                        <td
                          key={day}
                          className="min-w-[140px] border border-zinc-200 p-2 align-top dark:border-zinc-800"
                        >
                          {cell ? (
                            <Link
                              href={`/recipes/${cell.recipeId}`}
                              className="block space-y-1 hover:underline"
                            >
                              <div className="text-sm font-medium leading-snug">
                                {cell.title}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {cell.kcal} kcal · {cell.protein}E ·{" "}
                                {cell.carb}K · {cell.fat}F
                              </div>
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 bg-zinc-50 px-2 py-2 text-xs font-medium text-zinc-500 dark:bg-zinc-950">
                    Tagessumme
                  </td>
                  {dailyTotals.map((t, i) => (
                    <td
                      key={i}
                      className="border border-zinc-200 p-2 text-xs dark:border-zinc-800"
                    >
                      <div className="font-semibold">{t.kcal} kcal</div>
                      <div className="text-zinc-500">
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

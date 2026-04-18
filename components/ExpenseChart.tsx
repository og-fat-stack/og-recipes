import { fmtEuro } from "../lib/expense";

export function ExpenseChart({
  series,
  avgCents,
}: {
  series: { weekStart: Date; amountCents: number | null }[];
  avgCents: number | null;
}) {
  const max = Math.max(
    1,
    ...series.map((s) => s.amountCents ?? 0),
    avgCents ?? 0,
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative flex items-end gap-1 h-40">
        {avgCents != null && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-amber-500/70"
            style={{ bottom: `${(avgCents / max) * 100}%` }}
            title={`Ø ${fmtEuro(avgCents)}`}
          />
        )}
        {series.map((s, i) => {
          const h = s.amountCents != null ? (s.amountCents / max) * 100 : 0;
          const wsLabel = s.weekStart.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          });
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1"
              title={`KW ab ${wsLabel}: ${s.amountCents != null ? fmtEuro(s.amountCents) : "—"}`}
            >
              <div
                className={
                  "w-full rounded-t " +
                  (s.amountCents != null
                    ? "bg-emerald-500"
                    : "bg-zinc-200 dark:bg-zinc-800")
                }
                style={{ height: `${Math.max(h, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        <span>
          {series[0]?.weekStart.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
        {avgCents != null && (
          <span className="text-amber-600 dark:text-amber-400">
            Ø {fmtEuro(avgCents)}
          </span>
        )}
        <span>
          {series[series.length - 1]?.weekStart.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

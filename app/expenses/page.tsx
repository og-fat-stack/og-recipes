import Link from "next/link";
import { connection } from "next/server";
import {
  fmtEuro,
  getCurrentWeekExpense,
  getExpenseStats,
} from "../../lib/expense";
import { ExpenseChart } from "../../components/ExpenseChart";
import { ExpenseForm } from "./ExpenseForm";

export default async function ExpensesPage() {
  await connection();
  const [current, stats] = await Promise.all([
    getCurrentWeekExpense(),
    getExpenseStats(12),
  ]);

  const logged = stats.series.filter((s) => s.amountCents != null);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/plan" className="text-sm text-zinc-500 hover:underline">
          ← Plan
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Wocheneinkauf
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Einkaufspreis für diese Woche festhalten und Trends sehen.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          Aktuelle Woche
        </h2>
        <ExpenseForm
          defaultAmount={
            current ? (current.amountCents / 100).toString().replace(".", ",") : ""
          }
          defaultNote={current?.note ?? ""}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat
          label="Diese Woche"
          value={current ? fmtEuro(current.amountCents) : "—"}
        />
        <Stat
          label="Ø 12 Wochen"
          value={stats.avgCents != null ? fmtEuro(stats.avgCents) : "—"}
        />
        <Stat
          label="Min"
          value={stats.minCents != null ? fmtEuro(stats.minCents) : "—"}
        />
        <Stat
          label="Max"
          value={stats.maxCents != null ? fmtEuro(stats.maxCents) : "—"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">Letzte 12 Wochen</h2>
        <ExpenseChart series={stats.series} avgCents={stats.avgCents} />
      </section>

      {logged.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-500">Verlauf</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Woche ab</th>
                  <th className="px-3 py-2 text-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {[...logged].reverse().map((r, i) => (
                  <tr
                    key={i}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2">
                      {r.weekStart.toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {fmtEuro(r.amountCents!)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

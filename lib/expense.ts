import { db } from "./db";
import { addDays, weekStart } from "./time";

export function parseEuroToCents(input: string): number | null {
  const cleaned = input.trim().replace(",", ".").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
  return Math.round(n * 100);
}

export function fmtEuro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export async function getCurrentWeekExpense() {
  return db.weeklyExpense.findUnique({ where: { weekStart: weekStart() } });
}

export async function getRecentExpenses(weeks = 12) {
  const since = addDays(weekStart(), -(weeks - 1) * 7);
  const rows = await db.weeklyExpense.findMany({
    where: { weekStart: { gte: since } },
    orderBy: { weekStart: "asc" },
  });

  // Zero-fill missing weeks for a clean chart.
  const series: { weekStart: Date; amountCents: number | null }[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = addDays(since, i * 7);
    const hit = rows.find((r) => r.weekStart.getTime() === ws.getTime());
    series.push({ weekStart: ws, amountCents: hit?.amountCents ?? null });
  }
  return series;
}

export async function getExpenseStats(weeks = 12) {
  const series = await getRecentExpenses(weeks);
  const logged = series.filter((s) => s.amountCents != null) as {
    weekStart: Date;
    amountCents: number;
  }[];
  if (logged.length === 0) {
    return { series, avgCents: null, totalCents: 0, minCents: null, maxCents: null };
  }
  const total = logged.reduce((s, r) => s + r.amountCents, 0);
  const avg = Math.round(total / logged.length);
  const min = Math.min(...logged.map((r) => r.amountCents));
  const max = Math.max(...logged.map((r) => r.amountCents));
  return { series, avgCents: avg, totalCents: total, minCents: min, maxCents: max };
}

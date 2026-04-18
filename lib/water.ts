import { db } from "./db";
import { addDays } from "./time";
import { dayKey } from "./weight";

export type WaterDay = {
  day: Date;
  totalMl: number;
};

export async function getTodayTotal(): Promise<number> {
  const today = dayKey();
  const rows = await db.waterEntry.findMany({
    where: { day: today },
    select: { ml: true },
  });
  return rows.reduce((s, r) => s + r.ml, 0);
}

export async function getTodayEntries() {
  return db.waterEntry.findMany({
    where: { day: dayKey() },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentDays(days = 14): Promise<WaterDay[]> {
  const since = addDays(dayKey(), -(days - 1));
  const rows = await db.waterEntry.findMany({
    where: { day: { gte: since } },
    select: { day: true, ml: true },
  });
  const map = new Map<number, number>();
  for (let i = 0; i < days; i++) {
    const d = addDays(since, i);
    map.set(d.getTime(), 0);
  }
  for (const r of rows) {
    const k = r.day.getTime();
    map.set(k, (map.get(k) ?? 0) + r.ml);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, totalMl]) => ({ day: new Date(ts), totalMl }));
}

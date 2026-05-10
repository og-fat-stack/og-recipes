import { db } from "./db";

export async function getLatestMeasurement() {
  return db.measurementEntry.findFirst({ orderBy: { date: "desc" } });
}

export async function getLatestBodyFatPct(): Promise<number | null> {
  const entry = await db.measurementEntry.findFirst({
    where: { bodyFatPct: { not: null } },
    orderBy: { date: "desc" },
    select: { bodyFatPct: true },
  });
  return entry?.bodyFatPct ?? null;
}

export async function getMeasurementEntries(limit = 30) {
  return db.measurementEntry.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
}

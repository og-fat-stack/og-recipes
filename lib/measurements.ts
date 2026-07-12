import { db } from "./db";

export async function getLatestMeasurement(userId: number) {
  return db.measurementEntry.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });
}

export async function getLatestBodyFatPct(
  userId: number,
): Promise<number | null> {
  const entry = await db.measurementEntry.findFirst({
    where: { userId, bodyFatPct: { not: null } },
    orderBy: { date: "desc" },
    select: { bodyFatPct: true },
  });
  return entry?.bodyFatPct ?? null;
}

export async function getMeasurementEntries(userId: number, limit = 30) {
  return db.measurementEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

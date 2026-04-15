"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { dayKey } from "../../lib/weight";

export async function addWater(
  ml: number,
): Promise<{ id: number; ml: number } | null> {
  if (!Number.isFinite(ml) || ml <= 0 || ml > 3000) return null;
  const entry = await db.waterEntry.create({
    data: { day: dayKey(), ml: Math.round(ml) },
  });
  revalidatePath("/water");
  revalidatePath("/");
  return { id: entry.id, ml: entry.ml };
}

export async function deleteWaterEntry(id: number): Promise<void> {
  if (!Number.isFinite(id)) return;
  await db.waterEntry.delete({ where: { id } }).catch(() => {});
  revalidatePath("/water");
  revalidatePath("/");
}

export async function undoLastWater(): Promise<void> {
  const last = await db.waterEntry.findFirst({
    where: { day: dayKey() },
    orderBy: { createdAt: "desc" },
  });
  if (last) await db.waterEntry.delete({ where: { id: last.id } });
  revalidatePath("/water");
  revalidatePath("/");
}

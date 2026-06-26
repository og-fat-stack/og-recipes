"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { dayKey } from "../lib/weight";

export async function toggleDailyCheck(
  itemKey: string,
  checked: boolean,
): Promise<void> {
  const date = dayKey();
  await db.dailyCheck.upsert({
    where: { date_itemKey: { date, itemKey } },
    create: { date, itemKey, checked },
    update: { checked },
  });
  revalidatePath("/");
}

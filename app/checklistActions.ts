"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { requireUserId } from "../lib/auth";
import { dayKey } from "../lib/weight";

export async function toggleDailyCheck(
  itemKey: string,
  checked: boolean,
): Promise<void> {
  const userId = await requireUserId();
  const date = dayKey();
  await db.dailyCheck.upsert({
    where: { userId_date_itemKey: { userId, date, itemKey } },
    create: { userId, date, itemKey, checked },
    update: { checked },
  });
  revalidatePath("/");
}

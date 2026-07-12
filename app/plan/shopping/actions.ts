"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { requireUserId } from "../../../lib/auth";

async function assertOwnPlan(planId: number, userId: number): Promise<void> {
  const plan = await db.mealPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!plan) throw new Error("Plan nicht gefunden.");
}

export async function toggleShoppingItem(
  planId: number,
  itemKey: string,
  checked: boolean,
): Promise<void> {
  const userId = await requireUserId();
  await assertOwnPlan(planId, userId);
  await db.shoppingItemState.upsert({
    where: { planId_itemKey: { planId, itemKey } },
    create: { planId, itemKey, checked },
    update: { checked },
  });
  revalidatePath("/plan/shopping");
}

export async function resetShoppingList(planId: number): Promise<void> {
  const userId = await requireUserId();
  await assertOwnPlan(planId, userId);
  await db.shoppingItemState.deleteMany({ where: { planId } });
  revalidatePath("/plan/shopping");
}

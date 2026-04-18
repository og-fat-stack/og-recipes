"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";

export async function toggleShoppingItem(
  planId: number,
  itemKey: string,
  checked: boolean,
): Promise<void> {
  await db.shoppingItemState.upsert({
    where: { planId_itemKey: { planId, itemKey } },
    create: { planId, itemKey, checked },
    update: { checked },
  });
  revalidatePath("/plan/shopping");
}

export async function resetShoppingList(planId: number): Promise<void> {
  await db.shoppingItemState.deleteMany({ where: { planId } });
  revalidatePath("/plan/shopping");
}

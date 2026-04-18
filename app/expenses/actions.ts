"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../lib/db";
import { parseEuroToCents } from "../../lib/expense";
import { weekStart } from "../../lib/plan";

export type SaveExpenseState = { error?: string; ok?: boolean };

export async function saveExpense(
  _prev: SaveExpenseState,
  formData: FormData,
): Promise<SaveExpenseState> {
  const raw = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const cents = parseEuroToCents(raw);
  if (cents == null) {
    return { error: "Bitte einen gültigen Betrag eingeben (z. B. 42,30)." };
  }
  const ws = weekStart();
  await db.weeklyExpense.upsert({
    where: { weekStart: ws },
    create: { weekStart: ws, amountCents: cents, note },
    update: { amountCents: cents, note },
  });
  revalidatePath("/plan/shopping");
  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCurrentExpense(): Promise<void> {
  const ws = weekStart();
  await db.weeklyExpense.deleteMany({ where: { weekStart: ws } });
  revalidatePath("/plan/shopping");
  revalidatePath("/expenses");
  revalidatePath("/");
}

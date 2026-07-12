"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";
import { dayKey } from "../../lib/weight";

const LogSchema = z.object({
  steps: z.coerce.number().int().min(0).max(100000),
  date: z.string().optional(),
  note: z.string().max(200).optional(),
});

export type LogStepsState = { error?: string; ok?: boolean };

export async function logSteps(
  _prev: LogStepsState,
  formData: FormData,
): Promise<LogStepsState> {
  const parsed = LogSchema.safeParse({
    steps: formData.get("steps"),
    date: formData.get("date") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const userId = await requireUserId();
  const date = dayKey(
    parsed.data.date ? new Date(parsed.data.date) : new Date(),
  );

  await db.stepEntry.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      steps: parsed.data.steps,
      note: parsed.data.note ?? null,
    },
    update: { steps: parsed.data.steps, note: parsed.data.note ?? null },
  });

  revalidatePath("/training");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteSteps(
  _prev: LogStepsState,
  formData: FormData,
): Promise<LogStepsState> {
  const userId = await requireUserId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid id" };
  await db.stepEntry.deleteMany({ where: { id, userId } });
  revalidatePath("/training");
  revalidatePath("/");
  return { ok: true };
}

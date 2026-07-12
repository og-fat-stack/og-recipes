"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../lib/db";
import { requireUserId } from "../../lib/auth";

const MemorySchema = z.object({
  content: z.string().trim().max(8000),
});

export type SaveMemoryState = { error?: string; ok?: boolean };

export async function saveClaudeMemory(
  _prev: SaveMemoryState,
  formData: FormData,
): Promise<SaveMemoryState> {
  const parsed = MemorySchema.safeParse({
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const userId = await requireUserId();
  const { content } = parsed.data;

  await db.claudeMemory.upsert({
    where: { userId },
    create: { userId, content },
    update: { content },
  });

  revalidatePath("/memory");
  return { ok: true };
}

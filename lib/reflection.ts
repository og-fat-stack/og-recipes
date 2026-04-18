import { db } from "./db";
import type { ReflectionNotes } from "./ai/summarizeReflection";

export async function getRecentReflections(limit = 8) {
  return db.reflection.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      cookSession: { include: { recipe: true } },
    },
  });
}

export type RecentReflectionDigest = {
  recipeTitle: string;
  rating: number;
  summary: string;
  techniqueTakeaways: string[];
  nextTimeTry: string[];
};

export async function getReflectionDigests(
  limit = 6,
): Promise<RecentReflectionDigest[]> {
  const rows = await getRecentReflections(limit);
  return rows.map((r) => {
    const notes = r.claudeNotes as unknown as ReflectionNotes;
    return {
      recipeTitle: r.cookSession.recipe.title,
      rating: r.rating,
      summary: notes.summary,
      techniqueTakeaways: notes.techniqueTakeaways,
      nextTimeTry: notes.nextTimeTry,
    };
  });
}

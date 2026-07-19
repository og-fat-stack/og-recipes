import { db } from "./db";

export type Ingredient = { name: string; qty?: number; unit?: string };
export type RecipeInput = {
  title: string;
  cuisine: string;
  portions: number;
  kcalPerPortion: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  batchStorageDays: number;
  ingredients: Ingredient[];
  steps: string[];
  techniques: string[];
};

/** Parse "name | 200 | g" or "name, 200g" or just "name" per line. */
export function parseIngredients(raw: string): Ingredient[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const qty = Number(parts[1]);
        const unit = parts[2] || undefined;
        return {
          name,
          qty: Number.isFinite(qty) ? qty : undefined,
          unit,
        };
      }
      return { name: line };
    });
}

export function parseLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function getRecipes(userId: number) {
  return db.recipe.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRecipe(userId: number, id: number) {
  return db.recipe.findFirst({ where: { id, userId } });
}

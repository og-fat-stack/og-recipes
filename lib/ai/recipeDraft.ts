import { z } from "zod";

/**
 * Ein Rezept im App-Format, bevor es gespeichert wird — aus einem Link-Import
 * oder der Web-Suche (lib/ai/importRecipe.ts). Claude überträgt dabei nur ein
 * bestehendes Rezept, erfindet keins.
 */
export const RecipeDraftSchema = z.object({
  title: z.string().min(2).max(120),
  cuisine: z.string().min(2).max(60),
  mealType: z.enum(["breakfast", "main"]).default("main"),
  portions: z.number().int().min(1).max(30),
  kcalPerPortion: z.number().int().min(50).max(3000),
  proteinG: z.number().int().min(0).max(300),
  carbG: z.number().int().min(0).max(500),
  fatG: z.number().int().min(0).max(300),
  batchStorageDays: z.number().int().min(0).max(14),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().optional(),
        unit: z.string().optional(),
        // Von der Nährwertanalyse ergänzt (lib/nutrition.ts), nicht von Claude.
        grams: z.number().optional(),
        bls: z.string().optional(),
      }),
    )
    .min(2),
  steps: z.array(z.string().min(3)).min(1),
  techniques: z.array(z.string().min(2)).max(12),
  // Von der Nährwertanalyse gesetzt (lib/nutrition.ts), nicht von Claude.
  macroSource: z.string().optional(),
  macroCoverage: z.number().int().min(0).max(100).optional(),
});

export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;

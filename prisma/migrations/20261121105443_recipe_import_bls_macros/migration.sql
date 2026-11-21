-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "macroCoverage" INTEGER,
ADD COLUMN     "macroSource" TEXT,
ADD COLUMN     "mealType" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- Backfill: Mahlzeit-Typ aus der bisherigen cuisine-Konvention ableiten.
UPDATE "Recipe" SET "mealType" = CASE
  WHEN "cuisine" = 'Frühstück' THEN 'breakfast'
  WHEN "cuisine" = 'Snack' THEN 'snack'
  WHEN "cuisine" = 'Beilage' THEN 'side'
  ELSE 'main'
END;

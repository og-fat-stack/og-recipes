-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "goalWeightKg" REAL;
ALTER TABLE "Profile" ADD COLUMN "lastMacroWeightKg" REAL;

-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "kg" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_date_key" ON "WeightEntry"("date");

-- CreateIndex
CREATE INDEX "WeightEntry_date_idx" ON "WeightEntry"("date");

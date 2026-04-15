-- CreateTable
CREATE TABLE "Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "portions" INTEGER NOT NULL,
    "kcalPerPortion" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "batchStorageDays" INTEGER NOT NULL DEFAULT 4,
    "ingredients" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "techniques" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

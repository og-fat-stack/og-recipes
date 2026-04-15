-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CookSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "portionsMade" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookSession_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CookSession" ("createdAt", "date", "id", "portionsMade", "recipeId") SELECT "createdAt", "date", "id", "portionsMade", "recipeId" FROM "CookSession";
DROP TABLE "CookSession";
ALTER TABLE "new_CookSession" RENAME TO "CookSession";
CREATE INDEX "CookSession_date_idx" ON "CookSession"("date");
CREATE TABLE "new_PlannedMeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "portionsFromBatch" REAL NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PlannedMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlannedMeal" ("day", "id", "locked", "planId", "portionsFromBatch", "recipeId", "slot") SELECT "day", "id", "locked", "planId", "portionsFromBatch", "recipeId", "slot" FROM "PlannedMeal";
DROP TABLE "PlannedMeal";
ALTER TABLE "new_PlannedMeal" RENAME TO "PlannedMeal";
CREATE INDEX "PlannedMeal_recipeId_idx" ON "PlannedMeal"("recipeId");
CREATE UNIQUE INDEX "PlannedMeal_planId_day_slot_key" ON "PlannedMeal"("planId", "day", "slot");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

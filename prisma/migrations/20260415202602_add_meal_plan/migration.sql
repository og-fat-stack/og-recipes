-- CreateTable
CREATE TABLE "MealPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekStart" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "portionsFromBatch" REAL NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PlannedMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "portionsMade" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookSession_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_weekStart_key" ON "MealPlan"("weekStart");

-- CreateIndex
CREATE INDEX "PlannedMeal_recipeId_idx" ON "PlannedMeal"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedMeal_planId_day_slot_key" ON "PlannedMeal"("planId", "day", "slot");

-- CreateIndex
CREATE INDEX "CookSession_date_idx" ON "CookSession"("date");

-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "goalWeightKg" DOUBLE PRECISION,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT 'cut',
    "kcalTarget" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "waterMlTarget" INTEGER NOT NULL,
    "lastMacroWeightKg" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyExpense" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItemState" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "itemKey" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShoppingItemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "portionsFromBatch" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookSession" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "portionsMade" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" SERIAL NOT NULL,
    "cookSessionId" INTEGER NOT NULL,
    "wentWell" TEXT,
    "wentWrong" TEXT,
    "rating" INTEGER NOT NULL,
    "claudeNotes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterEntry" (
    "id" SERIAL NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "ml" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightEntry" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_weekStart_key" ON "MealPlan"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyExpense_weekStart_key" ON "WeeklyExpense"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingItemState_planId_itemKey_key" ON "ShoppingItemState"("planId", "itemKey");

-- CreateIndex
CREATE INDEX "PlannedMeal_recipeId_idx" ON "PlannedMeal"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedMeal_planId_day_slot_key" ON "PlannedMeal"("planId", "day", "slot");

-- CreateIndex
CREATE INDEX "CookSession_date_idx" ON "CookSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_cookSessionId_key" ON "Reflection"("cookSessionId");

-- CreateIndex
CREATE INDEX "WaterEntry_day_idx" ON "WaterEntry"("day");

-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_date_key" ON "WeightEntry"("date");

-- CreateIndex
CREATE INDEX "WeightEntry_date_idx" ON "WeightEntry"("date");

-- AddForeignKey
ALTER TABLE "ShoppingItemState" ADD CONSTRAINT "ShoppingItemState_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookSession" ADD CONSTRAINT "CookSession_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_cookSessionId_fkey" FOREIGN KEY ("cookSessionId") REFERENCES "CookSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

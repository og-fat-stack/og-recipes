-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "workoutKcalWeekly" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "context" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "kcalEstimate" INTEGER NOT NULL,
    "exercises" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPlan_weekStart_key" ON "TrainingPlan"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSession_planId_day_key" ON "TrainingSession"("planId", "day");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

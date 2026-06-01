-- DropForeignKey
ALTER TABLE "TrainingSession" DROP CONSTRAINT "TrainingSession_planId_fkey";

-- DropTable
DROP TABLE "TrainingSession";

-- DropTable
DROP TABLE "TrainingPlan";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "workoutKcalWeekly";

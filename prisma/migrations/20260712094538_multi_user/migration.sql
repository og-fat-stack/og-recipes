-- DropIndex
DROP INDEX "DailyCheck_date_itemKey_key";

-- DropIndex
DROP INDEX "MealPlan_weekStart_key";

-- DropIndex
DROP INDEX "MeasurementEntry_date_key";

-- DropIndex
DROP INDEX "StepEntry_date_key";

-- DropIndex
DROP INDEX "WeeklyExpense_weekStart_key";

-- DropIndex
DROP INDEX "WeightEntry_date_key";

-- AlterTable
CREATE SEQUENCE claudememory_id_seq;
ALTER TABLE "ClaudeMemory" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "id" SET DEFAULT nextval('claudememory_id_seq');
ALTER SEQUENCE claudememory_id_seq OWNED BY "ClaudeMemory"."id";

-- AlterTable
ALTER TABLE "CookSession" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "DailyCheck" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MeasurementEntry" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
CREATE SEQUENCE profile_id_seq;
ALTER TABLE "Profile" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "id" SET DEFAULT nextval('profile_id_seq');
ALTER SEQUENCE profile_id_seq OWNED BY "Profile"."id";

-- AlterTable
ALTER TABLE "StepEntry" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WeeklyExpense" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WeightEntry" ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Backfill: alle bestehenden Daten gehören dem Alt-Konto (id 1). Leerer
-- passwordHash = Bootstrap: erster Login mit dem bisherigen APP_PASSWORD
-- setzt es als persönliches Passwort.
INSERT INTO "User" ("id", "email", "name", "passwordHash")
VALUES (1, 'ghanaim512@gmail.com', 'Omar', '');
SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX("id") FROM "User"));

-- Die neuen Sequenzen dürfen nicht mit bestehenden ids (Singleton id = 1)
-- kollidieren.
SELECT setval('profile_id_seq', (SELECT COALESCE(MAX("id"), 0) + 1 FROM "Profile"), false);
SELECT setval('claudememory_id_seq', (SELECT COALESCE(MAX("id"), 0) + 1 FROM "ClaudeMemory"), false);

-- Der Code-Fallback für Claude-Memory wird neutral (neue Nutzer sollen nicht
-- Omars Vorlieben erben). Damit das Alt-Konto seine bisherigen Standard-
-- Vorlieben behält, werden sie hier einmalig als echte Zeile gespeichert.
INSERT INTO "ClaudeMemory" ("userId", "content", "updatedAt")
SELECT 1, E'Vorlieben & Abneigungen:\n- Gekochte Tomaten mag ich nur, wenn sie zu einer Soße verarbeitet sind (z. B. Passata, Tomatensoße, Schmorbasis). Gekochte Tomatenstücke, die nicht zu Soße zerfallen, mag ich nicht. Kalte/rohe Tomaten sind in Ordnung.\n- Paprika (das Gemüse) mag ich gar nicht — weder gekocht noch roh/fest. Bitte nicht als Zutat verwenden.\n- Paprikapulver als Gewürz ist dagegen gut und gerne genutzt.\n\nAusstattung:\n- Meine Töpfe und Pfannen sind nur begrenzt groß: Es passen maximal 3 Hähnchenschenkel nebeneinander auf die Pfannenoberfläche. Größere Mengen daher in mehreren Durchgängen anbraten (Pfanne nicht überfüllen, sonst Dampf statt Kruste) und in den Schritten darauf hinweisen.', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ClaudeMemory");

-- CreateIndex
CREATE UNIQUE INDEX "ClaudeMemory_userId_key" ON "ClaudeMemory"("userId");

-- CreateIndex
CREATE INDEX "CookSession_userId_idx" ON "CookSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheck_userId_date_itemKey_key" ON "DailyCheck"("userId", "date", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_weekStart_key" ON "MealPlan"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "MeasurementEntry_userId_date_key" ON "MeasurementEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StepEntry_userId_date_key" ON "StepEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyExpense_userId_weekStart_key" ON "WeeklyExpense"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_userId_date_key" ON "WeightEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaudeMemory" ADD CONSTRAINT "ClaudeMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyExpense" ADD CONSTRAINT "WeeklyExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookSession" ADD CONSTRAINT "CookSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementEntry" ADD CONSTRAINT "MeasurementEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepEntry" ADD CONSTRAINT "StepEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheck" ADD CONSTRAINT "DailyCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


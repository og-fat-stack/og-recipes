-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "lastMacroBodyFatPct" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MeasurementEntry" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "waistCm" DOUBLE PRECISION,
    "hipCm" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeasurementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeasurementEntry_date_key" ON "MeasurementEntry"("date");

-- CreateIndex
CREATE INDEX "MeasurementEntry_date_idx" ON "MeasurementEntry"("date");

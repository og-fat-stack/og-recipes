-- CreateTable
CREATE TABLE "StepEntry" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "steps" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StepEntry_date_key" ON "StepEntry"("date");

-- CreateIndex
CREATE INDEX "StepEntry_date_idx" ON "StepEntry"("date");

-- CreateTable
CREATE TABLE "DailyCheck" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "itemKey" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DailyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCheck_date_idx" ON "DailyCheck"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheck_date_itemKey_key" ON "DailyCheck"("date", "itemKey");

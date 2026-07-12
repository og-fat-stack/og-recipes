-- Login per Benutzername statt E-Mail; Alt-Konto heißt jetzt "omar".
ALTER TABLE "User" RENAME COLUMN "email" TO "username";
ALTER INDEX "User_email_key" RENAME TO "User_username_key";
UPDATE "User" SET "username" = 'omar' WHERE "id" = 1 AND "username" = 'ghanaim512@gmail.com';

-- Rezepte gehören jetzt einem Nutzer; Bestand geht ans Alt-Konto.
ALTER TABLE "Recipe" ADD COLUMN "userId" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Recipe_userId_idx" ON "Recipe"("userId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

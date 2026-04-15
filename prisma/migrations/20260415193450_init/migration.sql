-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "heightCm" REAL NOT NULL,
    "weightKg" REAL NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT 'cut',
    "kcalTarget" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "waterMlTarget" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

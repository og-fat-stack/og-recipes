-- Bewertung der Quellseite an gefundenen Rezepten. Nullable — der gerade
-- deployte Code kennt die Spalten nicht und bleibt davon unberührt.
ALTER TABLE "Recipe" ADD COLUMN "ratingCount" INTEGER,
ADD COLUMN "ratingValue" DOUBLE PRECISION;

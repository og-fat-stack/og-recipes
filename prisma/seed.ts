import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

// Resolve the DB file relative to this seed script, not cwd, so `npm run
// db:seed` hits the same file the Prisma CLI migrated.
const here = path.dirname(fileURLToPath(import.meta.url));
// Migrations resolved `file:./dev.db` relative to cwd (project root),
// so the real DB lives at ../dev.db from this seed script.
const dbPath = path.resolve(here, "..", "dev.db");

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: `file:${dbPath.replace(/\\/g, "/")}`,
  }),
});

const RECIPES = [
  {
    title: "Eiweißreiche Hähnchen-Shawarma-Bowls",
    cuisine: "Levantinisch",
    portions: 4,
    kcalPerPortion: 540,
    proteinG: 52,
    carbG: 48,
    fatG: 16,
    batchStorageDays: 4,
    ingredients: [
      { name: "Hähnchenschenkel o. H. & o. K. (ca. faustgroß pro Stück)", qty: 6, unit: "Stück" },
      { name: "Griechischer Joghurt (Becher à 500 g) — für Marinade", qty: 0.3, unit: "Becher" },
      { name: "Zitronensaft", qty: 2, unit: "EL" },
      { name: "Knoblauch, fein gehackt", qty: 4, unit: "Zehen" },
      { name: "Kreuzkümmel", qty: 2, unit: "TL" },
      { name: "Paprika edelsüß", qty: 2, unit: "TL" },
      { name: "Koriander gemahlen", qty: 1, unit: "TL" },
      { name: "Olivenöl", qty: 2, unit: "EL" },
      { name: "Basmatireis (trocken), 1 Kaffeetasse ≈ 200 ml", qty: 1.25, unit: "Tassen" },
      { name: "Gurke, gewürfelt", qty: 1, unit: "mittel" },
      { name: "Cherrytomaten (1 Schale ≈ 250 g)", qty: 1, unit: "Schale" },
      { name: "Petersilie, gehackt", qty: 1, unit: "Bund" },
      { name: "Salz, Pfeffer" },
    ],
    steps: [
      "Joghurt, Zitrone, Knoblauch, Gewürze, 1 EL Öl und Salz verrühren. Hähnchen mindestens 30 Min. marinieren.",
      "Reis waschen, bis das Wasser klar ist. Reis mit doppeltem Volumen Wasser (2 × Tasse) und einer Prise Salz kochen — 12 Min. zugedeckt + 10 Min. ruhen lassen.",
      "Pfanne mit 1 EL Öl heiß werden lassen. Hähnchen bei mittelstarker Hitze 4–5 Min. pro Seite scharf anbraten, bis die Oberfläche goldbraun und das Fleisch durchgegart ist (beim Einschneiden keine rosa Stellen, klarer Saft).",
      "Hähnchen 5 Min. ruhen lassen, dann schneiden.",
      "Gurke, Tomaten und Petersilie mit einer Prise Salz und einem Spritzer Zitrone vermengen.",
      "Reis, Hähnchen und Salat in 4 Boxen portionieren.",
    ],
    techniques: ["marinieren", "scharf anbraten", "Reispilaw"],
    notes:
      "Maße ohne Waage: Eine normale Kaffeetasse = ca. 200 ml. Becher ist der Standard-Joghurtbecher (500 g). Cherrytomatenschale vom Supermarkt = ca. 250 g.",
  },
  {
    title: "Mediterraner Ofenlachs mit Zitronen-Orzo",
    cuisine: "Mediterran",
    portions: 4,
    kcalPerPortion: 610,
    proteinG: 44,
    carbG: 52,
    fatG: 24,
    batchStorageDays: 3,
    ingredients: [
      { name: "Lachsfilet mit Haut (Portionsstücke à ca. handteller­groß)", qty: 4, unit: "Stück" },
      { name: "Orzo-Nudeln (trocken), Standard-Packung 500 g", qty: 0.55, unit: "Packung" },
      { name: "Cherrytomaten (1 Schale ≈ 250 g)", qty: 1.25, unit: "Schalen" },
      { name: "Kalamata-Oliven, entsteint — kleines Glas ≈ 150 g Abtropfgewicht", qty: 0.5, unit: "Glas" },
      { name: "Feta (Standard-Packung 200 g)", qty: 0.5, unit: "Packung" },
      { name: "Babyspinat (Handvoll ≈ 30 g)", qty: 3, unit: "Handvoll" },
      { name: "Zitrone (Abrieb + Saft)", qty: 2, unit: "Stück" },
      { name: "Knoblauch, fein gehackt", qty: 3, unit: "Zehen" },
      { name: "Olivenöl", qty: 3, unit: "EL" },
      { name: "Oregano, getrocknet", qty: 1, unit: "TL" },
      { name: "Salz, Pfeffer" },
    ],
    steps: [
      "Ofen auf 200°C Umluft vorheizen.",
      "Tomaten, Oliven, Knoblauch, 1 EL Öl, Oregano und Salz in einer Auflaufform vermengen. 10 Min. rösten.",
      "Lachs trocken tupfen, würzen und mit der Haut nach unten auf die Tomaten legen. 12–14 Min. backen — innen noch glasig-rosa, aber nicht mehr roh (Gabeltest: zerfällt leicht in Schuppen).",
      "Parallel Orzo in Salzwasser 8–9 Min. kochen. Eine kleine Tasse (ca. 100 ml) Nudelwasser aufheben, dann abgießen.",
      "Orzo mit Zitronenabrieb, Zitronensaft, 2 EL Öl, Feta und Spinat mischen. Bei Bedarf mit Nudelwasser lockern.",
      "Lachs in 4 Portionen auf den Orzo legen. Geröstete Tomaten und Oliven darauf verteilen.",
    ],
    techniques: ["rösten", "Pfannenreduktion", "emulgieren"],
    notes:
      "Maße ohne Waage: Eine Handvoll Babyspinat ≈ 30 g. Feta-Standardpackung = 200 g, also ca. die Hälfte nehmen. Zum Abmessen der Orzo: eine normale Kaffeetasse trocken ≈ 140 g, du brauchst also knapp 2 Tassen.",
  },
  {
    title: "Gewürzte Linsen-Bulgur-Mudschaddara mit Joghurt",
    cuisine: "Levantinisch",
    portions: 5,
    kcalPerPortion: 460,
    proteinG: 22,
    carbG: 68,
    fatG: 12,
    batchStorageDays: 5,
    ingredients: [
      { name: "Braune Linsen (trocken), 1 Tasse ≈ 200 ml", qty: 1.5, unit: "Tassen" },
      { name: "Grober Bulgur Nr. 3 (trocken)", qty: 1, unit: "Tasse" },
      { name: "Gelbe Zwiebeln, dünn geschnitten", qty: 3, unit: "mittel" },
      { name: "Olivenöl", qty: 4, unit: "EL" },
      { name: "Kreuzkümmel gemahlen", qty: 2, unit: "TL" },
      { name: "Zimt gemahlen", qty: 0.5, unit: "TL" },
      { name: "Lorbeerblatt", qty: 1, unit: "Stück" },
      { name: "Griechischer Joghurt (Becher à 500 g) — zum Servieren", qty: 1, unit: "Becher" },
      { name: "Zitronenspalten" },
      { name: "Salz, Pfeffer" },
    ],
    steps: [
      "Linsen waschen. Mit ca. 5 Tassen Wasser, Lorbeerblatt und einer Prise Salz 20–25 Min. köcheln, bis gar aber bissfest. Abgießen, 2 Tassen Kochwasser aufheben.",
      "Parallel Zwiebeln in Öl bei mittelschwacher Hitze 20–25 Min. unter häufigem Rühren goldbraun karamellisieren (nicht verbrennen). Das ist die Geschmacksbasis.",
      "Die Hälfte der Zwiebeln als Garnitur beiseite legen und auf Küchenpapier abtropfen lassen.",
      "Kreuzkümmel und Zimt zu den restlichen Zwiebeln geben, 30 Sek. anrösten. Bulgur dazu, 1 Min. mitrösten.",
      "Linsen und die 2 Tassen Kochwasser dazugeben. Abschmecken. Zugedeckt bei niedriger Hitze 12 Min. garen, bis der Bulgur weich ist. 10 Min. vom Herd ruhen lassen.",
      "Portionieren. Jeweils mit ca. 2 gehäuften Esslöffeln Joghurt, den knusprigen Zwiebeln und Zitrone servieren.",
    ],
    techniques: ["karamellisieren", "Gewürze anrösten", "Pilaw"],
    notes:
      "Maße ohne Waage: Eine normale Kaffeetasse = ca. 200 ml. Eine mittelgroße Zwiebel = ca. tennisball­groß. Verhältnis Bulgur zu Flüssigkeit = 1:2.",
  },
];

async function main() {
  const deleted = await db.recipe.deleteMany({});
  console.log(`deleted ${deleted.count} existing recipes`);
  for (const r of RECIPES) {
    const data = {
      title: r.title,
      cuisine: r.cuisine,
      portions: r.portions,
      kcalPerPortion: r.kcalPerPortion,
      proteinG: r.proteinG,
      carbG: r.carbG,
      fatG: r.fatG,
      batchStorageDays: r.batchStorageDays,
      ingredients: r.ingredients,
      steps: r.steps,
      techniques: r.techniques,
      notes: r.notes ?? null,
    };
    const existing = await db.recipe.findFirst({ where: { title: r.title } });
    if (existing) {
      await db.recipe.update({ where: { id: existing.id }, data });
      console.log(`updated: ${r.title}`);
    } else {
      await db.recipe.create({ data });
      console.log(`added: ${r.title}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

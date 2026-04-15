import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(here, "..", "dev.db");
const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: `file:${dbPath.replace(/\\/g, "/")}`,
  }),
});

async function main() {
  const plans = await db.mealPlan.deleteMany({});
  const sessions = await db.cookSession.deleteMany({});
  const recipes = await db.recipe.deleteMany({});
  console.log(
    `deleted: ${plans.count} Pläne, ${sessions.count} Kochsessions, ${recipes.count} Rezepte`,
  );
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

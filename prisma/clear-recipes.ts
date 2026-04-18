import "dotenv/config";
import { db } from "../lib/db";

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

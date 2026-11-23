/**
 * Plant einen Tagesbereich für einen Nutzer — derselbe Ablauf wie
 * „Woche generieren“ in der App (lib/planGeneration.ts), nur von der Konsole.
 * ACHTUNG: Ersetzt den bestehenden Plan der Woche.
 *
 *   npx tsx --env-file=.env.local scripts/planDays.ts <username> <startDay> <endDay> [this|next]
 *
 * startDay/endDay: 0 = Montag … 6 = Sonntag.
 */
import { db } from "../lib/db";
import { weekStartFor } from "../lib/plan";
import { getProfile } from "../lib/profile";
import { runPlanGeneration } from "../lib/planGeneration";

async function main() {
  const [username, start, end, week = "this"] = process.argv.slice(2);
  const startDay = Number(start);
  const endDay = Number(end);
  if (!username || !Number.isInteger(startDay) || !Number.isInteger(endDay) || startDay > endDay) {
    throw new Error("Aufruf: planDays.ts <username> <startDay> <endDay> [this|next]");
  }
  const user = await db.user.findUnique({ where: { username } });
  if (!user) throw new Error(`Nutzer ${username} gibt es nicht`);
  const profile = await getProfile(user.id);
  if (!profile) throw new Error("Kein Profil");
  const ws = weekStartFor(week === "next" ? "next" : "this");

  await db.planGeneration.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart: ws } },
    create: { userId: user.id, weekStart: ws, status: "generating", error: null },
    update: { status: "generating", error: null },
  });
  await runPlanGeneration({ userId: user.id, profile, ws, startDay, endDay, useUpIngredients: [] });

  const failed = await db.planGeneration.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: ws } },
  });
  if (failed) throw new Error(`Generierung fehlgeschlagen: ${failed.error}`);
  console.log("Plan gespeichert.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

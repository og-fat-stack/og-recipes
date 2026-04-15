import Link from "next/link";
import { getProfile } from "../lib/profile";
import { getWeightStats } from "../lib/weight";
import { getTodayTotal } from "../lib/water";
import { WaterRing } from "../components/WaterRing";
import { WaterControls } from "./water/WaterControls";
import { getRecipes } from "../lib/recipe";

function fmtKg(kg: number | null) {
  return kg == null ? "—" : `${kg.toFixed(1)} kg`;
}

const GOAL_LABELS: Record<string, string> = {
  cut: "Abnehmen",
  maintain: "Halten",
  gain: "Aufbauen",
};

export default async function Home() {
  const profile = await getProfile();
  const [stats, waterToday, recipes] = profile
    ? await Promise.all([
        getWeightStats(
          profile.goalWeightKg ?? null,
          0.4,
          profile.lastMacroWeightKg ?? null,
        ),
        getTodayTotal(),
        getRecipes(),
      ])
    : [null, 0, []];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Start</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Dein persönliches Koch- und Abnehm-Dashboard.
        </p>
      </header>

      {!profile ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">
            Lege dein Profil an, um deine Tagesziele zu berechnen.
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-block rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Zum Profil
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Tageskalorien"
              value={`${profile.kcalTarget}`}
              sub="kcal"
            />
            <Card
              title="Makros"
              value={`${profile.proteinG}E · ${profile.carbG}K · ${profile.fatG}F`}
              sub="g"
            />
            <Card
              title="Wasser"
              value={`${profile.waterMlTarget}`}
              sub="ml"
            />
            <Card
              title="Ziel"
              value={GOAL_LABELS[profile.goal] ?? profile.goal}
            />
          </section>

          <section className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center">
            <WaterRing
              totalMl={waterToday}
              targetMl={profile.waterMlTarget}
              size={140}
              stroke={12}
            />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">Wasser heute</h2>
                <Link
                  href="/water"
                  className="text-sm text-zinc-500 hover:underline"
                >
                  Öffnen →
                </Link>
              </div>
              <div className="text-sm text-zinc-500">
                Noch {Math.max(0, profile.waterMlTarget - waterToday)} ml
              </div>
              <WaterControls compact />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Gewichtsverlauf</h2>
              <Link
                href="/weight"
                className="text-sm text-zinc-500 hover:underline"
              >
                Öffnen →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label="7-Tage-Schnitt"
                value={fmtKg(stats?.rollingAvg7 ?? null)}
              />
              <MiniStat
                label="Wöchentliche Δ"
                value={
                  stats?.weeklyDeltaKg == null
                    ? "—"
                    : `${stats.weeklyDeltaKg > 0 ? "+" : ""}${stats.weeklyDeltaKg.toFixed(2)} kg`
                }
              />
              <MiniStat
                label="Zielgewicht"
                value={fmtKg(profile.goalWeightKg ?? null)}
              />
              <MiniStat
                label="Ankunft"
                value={
                  stats?.etaWeeks != null ? `${stats.etaWeeks} Wo` : "—"
                }
              />
            </div>
            {stats?.needsMacroRefresh && (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                Über 2 kg abgenommen seit der letzten Makro-Berechnung — neu
                berechnen auf der{" "}
                <Link href="/weight" className="underline">
                  Gewichtsseite
                </Link>
                .
              </p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                Rezepte{" "}
                <span className="text-sm font-normal text-zinc-500">
                  ({recipes.length})
                </span>
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href="/recipes/generate"
                  className="text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  ✨ KI
                </Link>
                <Link
                  href="/recipes/new"
                  className="text-zinc-500 hover:underline"
                >
                  + Neu
                </Link>
                <Link
                  href="/recipes"
                  className="text-zinc-500 hover:underline"
                >
                  Alle →
                </Link>
              </div>
            </div>
            {recipes.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                Noch keine Rezepte. Füge eins hinzu oder starte{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  npm run db:seed
                </code>
                .
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {recipes.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="flex items-center justify-between py-2 text-sm hover:underline"
                    >
                      <span>{r.title}</span>
                      <span className="text-xs text-zinc-500">
                        {r.kcalPerPortion} kcal · {r.cuisine}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
      <p className="mt-1 text-2xl font-semibold">
        {value}
        {sub && (
          <span className="ml-1 text-sm font-normal text-zinc-500">{sub}</span>
        )}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

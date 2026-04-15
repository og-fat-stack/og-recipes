import Link from "next/link";
import { getProfile } from "../lib/profile";
import { getWeightStats } from "../lib/weight";
import { getTodayTotal } from "../lib/water";
import { WaterRing } from "../components/WaterRing";
import { WaterControls } from "./water/WaterControls";

function fmtKg(kg: number | null) {
  return kg == null ? "—" : `${kg.toFixed(1)} kg`;
}

export default async function Home() {
  const profile = await getProfile();
  const [stats, waterToday] = profile
    ? await Promise.all([
        getWeightStats(
          profile.goalWeightKg ?? null,
          0.4,
          profile.lastMacroWeightKg ?? null,
        ),
        getTodayTotal(),
      ])
    : [null, 0];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Personal cooking + weight-loss dashboard.
        </p>
      </header>

      {!profile ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">
            Set up your profile to compute daily targets.
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-block rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Go to profile
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Daily calories"
              value={`${profile.kcalTarget}`}
              sub="kcal"
            />
            <Card
              title="Macros"
              value={`${profile.proteinG}P · ${profile.carbG}C · ${profile.fatG}F`}
              sub="g"
            />
            <Card
              title="Water"
              value={`${profile.waterMlTarget}`}
              sub="ml"
            />
            <Card title="Goal" value={profile.goal} />
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
                <h2 className="font-medium">Water today</h2>
                <Link
                  href="/water"
                  className="text-sm text-zinc-500 hover:underline"
                >
                  Open →
                </Link>
              </div>
              <div className="text-sm text-zinc-500">
                {Math.max(0, profile.waterMlTarget - waterToday)} ml to go
              </div>
              <WaterControls compact />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Weight progress</h2>
              <Link
                href="/weight"
                className="text-sm text-zinc-500 hover:underline"
              >
                Open →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="7-day avg" value={fmtKg(stats?.rollingAvg7 ?? null)} />
              <MiniStat
                label="Weekly Δ"
                value={
                  stats?.weeklyDeltaKg == null
                    ? "—"
                    : `${stats.weeklyDeltaKg > 0 ? "+" : ""}${stats.weeklyDeltaKg.toFixed(2)} kg`
                }
              />
              <MiniStat
                label="Goal"
                value={fmtKg(profile.goalWeightKg ?? null)}
              />
              <MiniStat
                label="ETA"
                value={
                  stats?.etaWeeks != null
                    ? `${stats.etaWeeks} wk`
                    : "—"
                }
              />
            </div>
            {stats?.needsMacroRefresh && (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                Down ≥ 2 kg since last macro calc — recalculate on the{" "}
                <Link href="/weight" className="underline">
                  weight page
                </Link>
                .
              </p>
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

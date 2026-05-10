import Link from "next/link";
import { getProfile } from "../lib/profile";
import { getWeightStats } from "../lib/weight";
import { getRecipes } from "../lib/recipe";
import { fmtEuro, getCurrentWeekExpense, getExpenseStats } from "../lib/expense";
import { getLatestMeasurement } from "../lib/measurements";
import {
  computeMacros,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "../lib/macros";
import {
  bodyFatStatus,
  idealWeightBandKg,
  leanMassKg,
  whr,
  whrStatus,
  whtr,
  whtrStatus,
  waistStatus,
  type BandStatus,
} from "../lib/bodyComp";

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
  const [stats, recipes, currentExpense, expenseStats, latestMeasurement] = profile
    ? await Promise.all([
        getWeightStats(
          profile.goalWeightKg ?? null,
          0.4,
          profile.lastMacroWeightKg ?? null,
        ),
        getRecipes(),
        getCurrentWeekExpense(),
        getExpenseStats(12),
        getLatestMeasurement(),
      ])
    : [null, [], null, null, null];

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
              footer={energyFooter(profile)}
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
              footer="empfohlene Tagesmenge"
            />
            <Card
              title="Ziel"
              value={GOAL_LABELS[profile.goal] ?? profile.goal}
            />
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
              {latestMeasurement?.bodyFatPct != null ? (
                <MiniStat
                  label="Magermasse"
                  value={fmtKg(
                    leanMassKg(profile.weightKg, latestMeasurement.bodyFatPct),
                  )}
                />
              ) : (
                <MiniStat
                  label="Zielgewicht"
                  value={fmtKg(profile.goalWeightKg ?? null)}
                />
              )}
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

          {latestMeasurement && (
            <CompositionCard
              profile={profile}
              latest={latestMeasurement}
            />
          )}

          {!latestMeasurement && (
            <section className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
              Noch keine Maße.{" "}
              <Link href="/measurements" className="underline">
                Taille, Hüfte oder Körperfett eintragen
              </Link>{" "}
              für ein persönliches Idealgewichts-Band jenseits des BMI.
            </section>
          )}

          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Wocheneinkauf</h2>
              <Link
                href="/expenses"
                className="text-sm text-zinc-500 hover:underline"
              >
                Öffnen →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniStat
                label="Diese Woche"
                value={
                  currentExpense
                    ? fmtEuro(currentExpense.amountCents)
                    : "—"
                }
              />
              <MiniStat
                label="Ø 12 Wochen"
                value={
                  expenseStats?.avgCents != null
                    ? fmtEuro(expenseStats.avgCents)
                    : "—"
                }
              />
              <MiniStat
                label="Bisher gesamt"
                value={
                  expenseStats && expenseStats.totalCents > 0
                    ? fmtEuro(expenseStats.totalCents)
                    : "—"
                }
              />
            </div>
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
  footer,
}: {
  title: string;
  value: string;
  sub?: string;
  footer?: string;
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
      {footer && (
        <p className="mt-1 text-xs text-zinc-500">{footer}</p>
      )}
    </div>
  );
}

function energyFooter(profile: {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: string;
  activityLevel: string;
  goal: string;
  kcalTarget: number;
  lastMacroBodyFatPct: number | null;
}): string {
  const m = computeMacros({
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.lastMacroBodyFatPct ?? undefined,
    age: profile.age,
    sex: profile.sex as Sex,
    activityLevel: profile.activityLevel as ActivityLevel,
    goal: profile.goal as Goal,
  });
  const delta = profile.kcalTarget - m.tdee;
  if (delta < 0) return `Defizit ${delta} kcal/Tag · Erhalt ${m.tdee}`;
  if (delta > 0) return `Überschuss +${delta} kcal/Tag · Erhalt ${m.tdee}`;
  return `Erhalt ${m.tdee} kcal/Tag`;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function CompositionCard({
  profile,
  latest,
}: {
  profile: { heightCm: number; weightKg: number; sex: string };
  latest: {
    waistCm: number | null;
    hipCm: number | null;
    bodyFatPct: number | null;
  };
}) {
  const sex = profile.sex as "male" | "female";
  const ideal =
    latest.bodyFatPct != null
      ? idealWeightBandKg({
          weightKg: profile.weightKg,
          bodyFatPct: latest.bodyFatPct,
          sex,
        })
      : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Körperkomposition</h2>
        <Link
          href="/measurements"
          className="text-sm text-zinc-500 hover:underline"
        >
          Öffnen →
        </Link>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {latest.waistCm != null && (
          <CompRow
            label="Taille"
            value={`${latest.waistCm.toFixed(1)} cm`}
            target={`< ${sex === "female" ? 80 : 94} cm`}
            status={waistStatus({ waistCm: latest.waistCm, sex })}
          />
        )}
        {latest.waistCm != null && (
          <CompRow
            label="WHtR"
            value={whtr(latest.waistCm, profile.heightCm).toFixed(2)}
            target="0,40–0,50"
            status={whtrStatus({
              waistCm: latest.waistCm,
              heightCm: profile.heightCm,
            })}
          />
        )}
        {latest.waistCm != null && latest.hipCm != null && (
          <CompRow
            label="WHR"
            value={whr(latest.waistCm, latest.hipCm).toFixed(2)}
            target={`≤ ${sex === "female" ? "0,85" : "0,90"}`}
            status={whrStatus({
              waistCm: latest.waistCm,
              hipCm: latest.hipCm,
              sex,
            })}
          />
        )}
        {latest.bodyFatPct != null && (
          <CompRow
            label="KFA"
            value={`${latest.bodyFatPct.toFixed(1)} %`}
            target={sex === "female" ? "18–25 %" : "10–18 %"}
            status={bodyFatStatus({
              bodyFatPct: latest.bodyFatPct,
              sex,
            })}
          />
        )}
        {ideal && (
          <li className="pt-1 text-zinc-600 dark:text-zinc-400">
            Idealgewicht:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {ideal.minKg.toFixed(1)}–{ideal.maxKg.toFixed(1)} kg
            </span>{" "}
            (bei aktueller Magermasse, {sex === "female" ? "18–25" : "10–18"} % KFA)
          </li>
        )}
      </ul>
    </section>
  );
}

function CompRow({
  label,
  value,
  target,
  status,
}: {
  label: string;
  value: string;
  target: string;
  status: BandStatus;
}) {
  const cls =
    status === "green"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : status === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className="w-16 text-zinc-500">{label}</span>
      <span className="font-semibold">{value}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>
        {status === "green"
          ? "im Ziel"
          : status === "amber"
            ? "leicht außerhalb"
            : "deutlich außerhalb"}
      </span>
      <span className="text-xs text-zinc-500">Ziel {target}</span>
    </li>
  );
}

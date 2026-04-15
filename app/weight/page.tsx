import Link from "next/link";
import { getProfile } from "../../lib/profile";
import { getWeightEntries, getWeightStats } from "../../lib/weight";
import { WeightForm } from "./WeightForm";
import { RefreshMacrosButton } from "./RefreshMacrosButton";

function fmtKg(kg: number | null) {
  return kg == null ? "—" : `${kg.toFixed(1)} kg`;
}
function fmtDelta(kg: number | null) {
  if (kg == null) return "—";
  const sign = kg > 0 ? "+" : "";
  return `${sign}${kg.toFixed(2)} kg`;
}
function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("de-DE") : "—";
}

export default async function WeightPage() {
  const profile = await getProfile();
  const entries = await getWeightEntries(60);
  const stats = await getWeightStats(
    profile?.goalWeightKg ?? null,
    0.4,
    profile?.lastMacroWeightKg ?? null,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Gewicht</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Täglich wiegen (morgens, nach dem WC, vor Essen/Trinken). Achte auf
          den 7-Tage-Schnitt, nicht den Tageswert.
        </p>
      </header>

      {!profile && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          Zuerst <Link href="/profile" className="underline">Profil</Link>{" "}
          ausfüllen (inkl. Zielgewicht), um Prognosen zu sehen.
        </div>
      )}

      {profile && !profile.goalWeightKg && (
        <div className="rounded-xl border border-dashed border-amber-400 p-4 text-sm">
          Zielgewicht im{" "}
          <Link href="/profile" className="underline">Profil</Link> hinterlegen,
          um die Ankunft zu berechnen.
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Letzter Wert" value={fmtKg(stats.latestKg)} sub={fmtDate(stats.latestDate)} />
        <Stat label="7-Tage-Schnitt" value={fmtKg(stats.rollingAvg7)} />
        <Stat
          label="Wöchentliche Δ"
          value={fmtDelta(stats.weeklyDeltaKg)}
          tone={
            stats.weeklyDeltaKg == null
              ? undefined
              : stats.weeklyDeltaKg < 0
                ? "good"
                : "warn"
          }
        />
        <Stat
          label="Ankunft am Ziel"
          value={
            stats.etaWeeks != null
              ? `${stats.etaWeeks} Wochen`
              : profile?.goalWeightKg == null
                ? "—"
                : "am Ziel"
          }
          sub={fmtDate(stats.etaDate)}
        />
      </section>

      {stats.needsMacroRefresh && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <div>
            Du hast seit der letzten Makro-Berechnung ≥ 2 kg abgenommen.
            Der Grundumsatz hat sich verändert — bitte neu berechnen.
          </div>
          <RefreshMacrosButton highlight />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">Wiegen eintragen</h2>
        <WeightForm defaultKg={stats.latestKg ?? profile?.weightKg} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500">Verlauf</h2>
          {!stats.needsMacroRefresh && entries.length > 0 && (
            <RefreshMacrosButton />
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">Noch keine Einträge.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Datum</th>
                  <th className="px-3 py-2">Gewicht</th>
                  <th className="px-3 py-2">Notiz</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2">{fmtDate(e.date)}</td>
                    <td className="px-3 py-2">{e.kg.toFixed(1)} kg</td>
                    <td className="px-3 py-2 text-zinc-500">{e.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { requireUserId } from "../../lib/auth";
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
  return d
    ? d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })
    : "—";
}

export default async function WeightPage() {
  await connection();
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const entries = await getWeightEntries(userId, 60);
  const stats = await getWeightStats(
    userId,
    profile?.goalWeightKg ?? null,
    0.4,
    profile?.lastMacroWeightKg ?? null,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Gewicht</h1>
        <p className="mt-1 text-ink-muted">
          Täglich wiegen (morgens, nach dem WC, vor Essen/Trinken). Achte auf
          den 7-Tage-Schnitt, nicht den Tageswert.
        </p>
      </header>

      {!profile && (
        <div className="rounded-card border border-dashed border-line-strong p-4 text-sm">
          Zuerst <Link href="/profile" className="underline">Profil</Link>{" "}
          ausfüllen (inkl. Zielgewicht), um Prognosen zu sehen.
        </div>
      )}

      {profile && !profile.goalWeightKg && (
        <div className="rounded-card border border-dashed border-warn-line p-4 text-sm">
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warn-line bg-warn-surface p-4 text-sm">
          <div>
            Du hast seit der letzten Makro-Berechnung ≥ 2 kg abgenommen.
            Der Grundumsatz hat sich verändert — bitte neu berechnen.
          </div>
          <RefreshMacrosButton highlight />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-subtle">Wiegen eintragen</h2>
        <WeightForm defaultKg={stats.latestKg ?? profile?.weightKg} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-subtle">Verlauf</h2>
          {!stats.needsMacroRefresh && entries.length > 0 && (
            <RefreshMacrosButton />
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-subtle">Noch keine Einträge.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wide text-ink-subtle">
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
                    className="border-t border-line"
                  >
                    <td className="px-3 py-2">{fmtDate(e.date)}</td>
                    <td className="px-3 py-2">{e.kg.toFixed(1)} kg</td>
                    <td className="px-3 py-2 text-ink-subtle">{e.note ?? ""}</td>
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
      ? "text-accent-ink"
      : tone === "warn"
        ? "text-warn-ink"
        : "";
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-ink-subtle">{sub}</div>}
    </div>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import { getMeasurementEntries } from "../../lib/measurements";
import {
  bodyFatStatus,
  idealWeightBandKg,
  whr,
  whrStatus,
  whtr,
  whtrStatus,
  waistStatus,
  type BandStatus,
} from "../../lib/bodyComp";
import { MeasurementForm } from "./MeasurementForm";

function fmtDate(d: Date) {
  return d.toLocaleDateString("de-DE");
}

export default async function MeasurementsPage() {
  await connection();
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const entries = await getMeasurementEntries(userId, 60);
  const latest = entries[0] ?? null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Maße</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Wissenschaftliche Heim-Messungen jenseits des BMI: Taille, Hüfte und
          Körperfettanteil. Alle Felder optional — trag ein, was du heute hast.
        </p>
      </header>

      {!profile && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          Zuerst <Link href="/profile" className="underline">Profil</Link>{" "}
          ausfüllen, damit Zielbänder berechnet werden können.
        </div>
      )}

      {profile && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500">
            Neue Messung eintragen
          </h2>
          <MeasurementForm
            heightCm={profile.heightCm}
            sex={profile.sex as "male" | "female"}
            defaults={
              latest
                ? {
                    waistCm: latest.waistCm,
                    hipCm: latest.hipCm,
                    bodyFatPct: latest.bodyFatPct,
                  }
                : undefined
            }
          />
        </section>
      )}

      {profile && latest && (
        <CurrentBands profile={profile} latest={latest} />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-500">Verlauf</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">Noch keine Einträge.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Datum</th>
                  <th className="px-3 py-2">Taille</th>
                  <th className="px-3 py-2">Hüfte</th>
                  <th className="px-3 py-2">KFA</th>
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
                    <td className="px-3 py-2">
                      {e.waistCm != null ? `${e.waistCm.toFixed(1)} cm` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.hipCm != null ? `${e.hipCm.toFixed(1)} cm` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.bodyFatPct != null
                        ? `${e.bodyFatPct.toFixed(1)} %`
                        : "—"}
                    </td>
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

function CurrentBands({
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
      <h2 className="font-medium">Aktuelle Werte vs. Zielband</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {latest.waistCm != null && (
          <BandRow
            label="Taille"
            value={`${latest.waistCm.toFixed(1)} cm`}
            target={`< ${sex === "female" ? 80 : 94} cm`}
            status={waistStatus({ waistCm: latest.waistCm, sex })}
          />
        )}
        {latest.waistCm != null && (
          <BandRow
            label="WHtR"
            value={whtr(latest.waistCm, profile.heightCm).toFixed(2)}
            target="0.40–0.50"
            status={whtrStatus({
              waistCm: latest.waistCm,
              heightCm: profile.heightCm,
            })}
          />
        )}
        {latest.waistCm != null && latest.hipCm != null && (
          <BandRow
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
          <BandRow
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
          <li className="pt-2 text-zinc-600 dark:text-zinc-400">
            Persönliches Idealgewicht (bei aktueller Magermasse,{" "}
            {sex === "female" ? "18–25" : "10–18"} % KFA):{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {ideal.minKg.toFixed(1)}–{ideal.maxKg.toFixed(1)} kg
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

function BandRow({
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
  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className="w-16 text-zinc-500">{label}</span>
      <span className="font-semibold">{value}</span>
      <Chip status={status} />
      <span className="text-xs text-zinc-500">Ziel {target}</span>
    </li>
  );
}

function Chip({ status }: { status: BandStatus }) {
  const cls =
    status === "green"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : status === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
  const label =
    status === "green"
      ? "im Zielbereich"
      : status === "amber"
        ? "leicht außerhalb"
        : "deutlich außerhalb";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>
  );
}

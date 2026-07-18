import Link from "next/link";
import { connection } from "next/server";
import { requireUserId } from "../../lib/auth";
import { getProfile } from "../../lib/profile";
import { getLatestMeasurement } from "../../lib/measurements";
import {
  computeMacros,
  type Goal,
  type Sex,
} from "../../lib/macros";
import { planActivityKcalPerDay } from "../../lib/training";
import { ActivityToggle } from "../../components/ActivityToggle";
import { BudgetToggle } from "../../components/BudgetToggle";
import { VegetarianToggle } from "../../components/VegetarianToggle";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  await connection();
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const latest = profile ? await getLatestMeasurement(userId) : null;
  const energy = profile
    ? computeMacros({
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        bodyFatPct: profile.lastMacroBodyFatPct ?? undefined,
        age: profile.age,
        sex: profile.sex as Sex,
        activityLevel: "sedentary",
        goal: profile.goal as Goal,
        thyroidReduced: profile.thyroidReduced,
        exerciseKcalPerDay: profile.activityEnabled
          ? planActivityKcalPerDay(profile.weightKg)
          : 0,
      })
    : null;
  const deficit = energy ? profile!.kcalTarget - energy.tdee : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Profil</h1>
        <p className="mt-1 text-ink-muted">
          Deine Angaben bestimmen die täglichen Kalorien- und Makro-Ziele.
        </p>
      </header>

      {profile && energy && (
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-sm font-medium text-ink-subtle">
            Aktuelle Ziele
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="kcal" value={profile.kcalTarget.toString()} />
            <Stat label="Eiweiß" value={`${profile.proteinG} g`} />
            <Stat label="Kohlenhydrate" value={`${profile.carbG} g`} />
            <Stat label="Fett" value={`${profile.fatG} g`} />
            <Stat label="Wasser" value={`${profile.waterMlTarget} ml`} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <Stat label="Grundumsatz" value={`${energy.bmr} kcal`} />
            <Stat
              label="Aktivität (Ø/Tag)"
              value={`+${energy.exerciseKcal} kcal`}
            />
            <Stat label="Erhaltungsbedarf" value={`${energy.tdee} kcal`} />
            <Stat
              label={
                deficit < 0
                  ? "Defizit"
                  : deficit > 0
                    ? "Überschuss"
                    : "Bilanz"
              }
              value={
                deficit === 0
                  ? "Erhalt"
                  : `${deficit > 0 ? "+" : ""}${deficit} kcal/Tag`
              }
            />
          </div>
          <div className="mt-4 space-y-2">
            <ActivityToggle
              enabled={profile.activityEnabled}
              extraKcal={planActivityKcalPerDay(profile.weightKg)}
            />
            <BudgetToggle budgetConscious={profile.budgetConscious} />
            <VegetarianToggle vegetarian={profile.vegetarian} />
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Berechnung:{" "}
            {profile.lastMacroBodyFatPct != null
              ? `Katch-McArdle (KFA ${profile.lastMacroBodyFatPct.toFixed(1)} %, Protein nach Magermasse)`
              : "Mifflin-St Jeor (KFA für genaueren Wert eintragen)"}
            {profile.thyroidReduced ? " · Grundumsatz −10 % (Schilddrüse)" : ""}
. {deficit !== 0
              ? `Theoretisch ≈ ${(Math.abs(deficit) * 7 / 7700).toFixed(2)} kg Fett pro Woche (1 kg Fett ≈ 7700 kcal).`
              : "Keine Gewichtsänderung erwartet."}
          </p>
        </section>
      )}

      {profile && (
        <section className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-subtle">Letzte Messung</h2>
            <Link
              href="/measurements"
              className="text-sm text-ink-subtle hover:underline"
            >
              {latest ? "Bearbeiten →" : "Eintragen →"}
            </Link>
          </div>
          {latest ? (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Taille"
                value={
                  latest.waistCm != null
                    ? `${latest.waistCm.toFixed(1)} cm`
                    : "—"
                }
              />
              <Stat
                label="Hüfte"
                value={
                  latest.hipCm != null ? `${latest.hipCm.toFixed(1)} cm` : "—"
                }
              />
              <Stat
                label="KFA"
                value={
                  latest.bodyFatPct != null
                    ? `${latest.bodyFatPct.toFixed(1)} %`
                    : "—"
                }
              />
              <Stat
                label="Datum"
                value={latest.date.toLocaleDateString("de-DE", {
                  timeZone: "Europe/Berlin",
                })}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-subtle">
              Noch keine Maße erfasst.
            </p>
          )}
        </section>
      )}

      <ProfileForm profile={profile} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

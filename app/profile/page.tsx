import { getProfile } from "../../lib/profile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Stats drive your daily calorie and macro targets.
        </p>
      </header>

      {profile && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-500">
            Current targets
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="kcal" value={profile.kcalTarget.toString()} />
            <Stat label="Protein" value={`${profile.proteinG} g`} />
            <Stat label="Carbs" value={`${profile.carbG} g`} />
            <Stat label="Fat" value={`${profile.fatG} g`} />
            <Stat label="Water" value={`${profile.waterMlTarget} ml`} />
          </div>
        </section>
      )}

      <ProfileForm profile={profile} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

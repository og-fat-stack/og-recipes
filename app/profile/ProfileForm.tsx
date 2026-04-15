"use client";

import { useActionState } from "react";
import { saveProfile, type SaveProfileState } from "./actions";
import type { Profile } from "../../lib/generated/prisma/client";

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sitzend (Schreibtisch, wenig Bewegung)" },
  { value: "light", label: "Leicht (1–3×/Woche)" },
  { value: "moderate", label: "Moderat (3–5×/Woche)" },
  { value: "active", label: "Aktiv (6–7×/Woche)" },
  { value: "very_active", label: "Sehr aktiv (2×/Tag)" },
] as const;

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState<
    SaveProfileState,
    FormData
  >(saveProfile, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Größe (cm)"
          name="heightCm"
          type="number"
          step="0.5"
          defaultValue={profile?.heightCm ?? ""}
          required
        />
        <Field
          label="Gewicht (kg)"
          name="weightKg"
          type="number"
          step="0.1"
          defaultValue={profile?.weightKg ?? ""}
          required
        />
        <Field
          label="Zielgewicht (kg)"
          name="goalWeightKg"
          type="number"
          step="0.1"
          defaultValue={profile?.goalWeightKg ?? ""}
        />
        <Field
          label="Alter"
          name="age"
          type="number"
          defaultValue={profile?.age ?? ""}
          required
        />
        <Select
          label="Geschlecht"
          name="sex"
          defaultValue={profile?.sex ?? "male"}
          options={[
            { value: "male", label: "Männlich" },
            { value: "female", label: "Weiblich" },
          ]}
        />
        <Select
          label="Aktivitätslevel"
          name="activityLevel"
          defaultValue={profile?.activityLevel ?? "light"}
          options={ACTIVITY_OPTIONS}
        />
        <Select
          label="Ziel"
          name="goal"
          defaultValue={profile?.goal ?? "cut"}
          options={[
            { value: "cut", label: "Abnehmen" },
            { value: "maintain", label: "Halten" },
            { value: "gain", label: "Aufbauen" },
          ]}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Speichern..." : "Profil speichern"}
      </button>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  const { label, ...rest } = props;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        {...rest}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

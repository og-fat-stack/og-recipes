"use client";

import { useActionState } from "react";
import { saveProfile, type SaveProfileState } from "./actions";
import type { Profile } from "../../lib/generated/prisma/client";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState<
    SaveProfileState,
    FormData
  >(saveProfile, {});

  const formKey = profile
    ? `${profile.id}-${new Date(profile.updatedAt).getTime()}`
    : "new";

  return (
    <form key={formKey} action={formAction} className="space-y-4">
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

      <label className="flex items-start gap-3 rounded-control border border-line p-3 text-sm">
        <input
          type="checkbox"
          name="thyroidReduced"
          defaultChecked={profile?.thyroidReduced ?? false}
          className="mt-0.5 h-4 w-4"
        />
        <span className="flex flex-col">
          <span className="font-medium">
            Schilddrüse entfernt / behandelte Hypothyreose
          </span>
          <span className="text-xs text-ink-subtle">
            Senkt den geschätzten Grundumsatz um 10 %, weil die üblichen Formeln
            eine normale Schilddrüsenfunktion voraussetzen. Der echte Wiegetrend
            bleibt maßgeblich.
          </span>
        </span>
      </label>

      <p className="text-xs text-ink-subtle">
        Kein Aktivitätslevel mehr nötig: Dein täglicher Aktivitätsverbrauch wird
        aus dem{" "}
        <a href="/training" className="underline">
          Trainingsplan
        </a>{" "}
        (Einheiten + Schritt-Ziel) berechnet und auf den Grundbedarf addiert.
      </p>

      {state.error && (
        <p className="text-sm text-danger-ink">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-accent-ink">
          Gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast transition-colors hover:bg-contrast-hover disabled:opacity-50"
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
      <span className="text-ink-muted">{label}</span>
      <input
        {...rest}
        className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base shadow-sm focus:border-contrast focus:outline-none"
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
      <span className="text-ink-muted">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base shadow-sm focus:border-contrast focus:outline-none"
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

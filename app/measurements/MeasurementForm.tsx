"use client";

import { useActionState, useMemo, useState } from "react";
import { saveMeasurement, type SaveMeasurementState } from "./actions";
import { usNavyBodyFatPct } from "../../lib/bodyComp";
import type { Sex } from "../../lib/macros";

export function MeasurementForm({
  defaults,
  heightCm,
  sex,
}: {
  defaults?: {
    waistCm: number | null;
    hipCm: number | null;
    bodyFatPct: number | null;
  };
  heightCm: number;
  sex: Sex;
}) {
  const [state, action, pending] = useActionState<
    SaveMeasurementState,
    FormData
  >(saveMeasurement, {});
  const today = new Date().toISOString().slice(0, 10);

  const [showNavy, setShowNavy] = useState(false);
  const [neckCm, setNeckCm] = useState("");
  const [navyWaistCm, setNavyWaistCm] = useState("");
  const [navyHipCm, setNavyHipCm] = useState("");

  const navyBf = useMemo(() => {
    const n = Number(neckCm);
    const w = Number(navyWaistCm);
    const h = sex === "female" ? Number(navyHipCm) : undefined;
    if (!n || !w || (sex === "female" && !h)) return null;
    const v = usNavyBodyFatPct({
      heightCm,
      neckCm: n,
      waistCm: w,
      hipCm: h,
      sex,
    });
    return Number.isFinite(v) ? v : null;
  }, [neckCm, navyWaistCm, navyHipCm, heightCm, sex]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Taille (cm)"
          name="waistCm"
          type="number"
          step="0.1"
          defaultValue={defaults?.waistCm ?? ""}
        />
        <Field
          label="Hüfte (cm)"
          name="hipCm"
          type="number"
          step="0.1"
          defaultValue={defaults?.hipCm ?? ""}
        />
        <Field
          label="Körperfett (%)"
          name="bodyFatPct"
          type="number"
          step="0.1"
          defaultValue={defaults?.bodyFatPct ?? ""}
        />
        <Field label="Datum" name="date" type="date" defaultValue={today} />
      </div>
      <Field
        label="Notiz (optional)"
        name="note"
        type="text"
        placeholder="z. B. morgens nach WC"
      />

      <div className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowNavy((v) => !v)}
          className="text-left text-zinc-600 hover:underline dark:text-zinc-400"
        >
          {showNavy ? "▾" : "▸"} Körperfett mit Maßband schätzen (US-Navy)
        </button>
        {showNavy && (
          <div className="mt-3 space-y-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <CalcField
                label="Hals (cm)"
                value={neckCm}
                onChange={setNeckCm}
              />
              <CalcField
                label="Taille (cm)"
                value={navyWaistCm}
                onChange={setNavyWaistCm}
              />
              {sex === "female" && (
                <CalcField
                  label="Hüfte (cm)"
                  value={navyHipCm}
                  onChange={setNavyHipCm}
                />
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Hals: schmalste Stelle unter dem Adamsapfel. Taille: Männer in
              Bauchnabelhöhe, Frauen schmalste Stelle. {sex === "female" && "Hüfte: breiteste Stelle."}
            </p>
            <p className="text-sm">
              Geschätzter KFA:{" "}
              <span className="font-semibold">
                {navyBf == null ? "—" : `${navyBf.toFixed(1)} %`}
              </span>
              {navyBf != null && (
                <button
                  type="button"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(
                      'input[name="bodyFatPct"]',
                    );
                    if (input) input.value = navyBf.toFixed(1);
                  }}
                  className="ml-3 rounded-full bg-zinc-100 px-3 py-1 text-xs hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  Wert übernehmen
                </button>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Speichern..." : "Eintragen"}
        </button>
        {state.error && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
        {state.ok && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Gespeichert.
          </span>
        )}
      </div>
    </form>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
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

function CalcField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

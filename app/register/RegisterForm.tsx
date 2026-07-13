"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { AuthShell } from "../../components/auth/AuthShell";
import { FloatingField } from "../../components/auth/FloatingField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthSubmit } from "../../components/auth/AuthSubmit";
import { ProgressBar } from "../../components/ProgressBar";
import type { MascotState } from "../../components/mascot/Mascot";
import { register, type RegisterState } from "./actions";

type Field = "name" | "user" | "pass";

// Begleittext zum Fortschrittsbalken: wird bei jedem gültigen Feld wärmer.
const CAPTIONS = [
  "Drei kurze Felder — leg los.",
  "Guter Anfang.",
  "Fast geschafft.",
  "Bereit — willkommen in der Küche!",
];

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    register,
    {},
  );

  const [active, setActive] = useState<null | Field>(null);
  const [reveal, setReveal] = useState(false);
  const [values, setValues] = useState({ name: "", username: "", password: "" });

  const name = values.name.trim();
  const username = values.username.trim();
  const nameOk = name.length >= 2;
  const userOk =
    username.length >= 2 &&
    username.length <= 30 &&
    /^[a-z0-9._-]+$/i.test(username);
  const passOk = values.password.length >= 8;
  const validCount = (nameOk ? 1 : 0) + (userOk ? 1 : 0) + (passOk ? 1 : 0);

  // Pott-Zustand: Passwort (verdeckt/lugend) > schaut aufs Feld > Fehler > Ruhe.
  // Fehler nur, solange nichts fokussiert ist — sobald der Nutzer ein Feld
  // anfasst, um zu korrigieren, schaut Pott wieder zu (watching).
  const mascot: MascotState =
    active === "pass"
      ? reveal
        ? "peekingOpen"
        : "peeking"
      : active === "name" || active === "user"
        ? "watching"
        : state.error
          ? "error"
          : "idle";

  const set = (k: keyof typeof values, value: string) =>
    setValues((v) => ({ ...v, [k]: value }));

  return (
    <form
      action={formAction}
      className="relative mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center"
    >
      <AuthShell
        state={mascot}
        title="Werde Teil der Küche"
        subtitle="Dein eigenes Konto — Profil, Ziele, Pläne und Tracking, abgestimmt auf dich."
        footer={
          <p className="mt-6 text-center text-sm text-ink-subtle">
            Schon ein Konto?{" "}
            <Link
              href="/login"
              className="font-medium text-accent-ink underline-offset-2 hover:underline"
            >
              Anmelden
            </Link>
          </p>
        }
      >
        {/* Fortschritt: füllt sich, während die drei Felder gültig werden */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-medium text-ink-muted">
              {CAPTIONS[validCount]}
            </span>
            <span className="text-xs font-semibold tabular-nums text-accent-ink">
              {validCount}/3
            </span>
          </div>
          <ProgressBar
            value={validCount}
            max={3}
            label="Registrierungsfortschritt"
          />
        </div>

        <div className="flex flex-col gap-3">
          <FloatingField
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            autoFocus
            required
            label="Name"
            onFocus={() => setActive("name")}
            onBlur={() => setActive(null)}
            onInput={(e) => set("name", e.currentTarget.value)}
          />

          <FloatingField
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            pattern="[A-Za-z0-9._\-]+"
            minLength={2}
            maxLength={30}
            required
            label="Benutzername"
            onFocus={() => setActive("user")}
            onBlur={() => setActive(null)}
            onInput={(e) => set("username", e.currentTarget.value)}
          />
          <Req ok={userOk}>2–30 Zeichen · klein, Zahlen, . - _</Req>

          <PasswordField
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            reveal={reveal}
            onToggleReveal={() => setReveal((v) => !v)}
            onFocus={() => setActive("pass")}
            onBlur={() => setActive(null)}
            onInput={(e) => set("password", e.currentTarget.value)}
          />
          <Req ok={passOk}>Mindestens 8 Zeichen</Req>

          {state.error ? (
            <p
              role="alert"
              className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink"
            >
              {state.error}
            </p>
          ) : null}

          <AuthSubmit pending={pending}>
            {pending ? "Wird erstellt …" : "Konto erstellen"}
          </AuthSubmit>
        </div>
      </AuthShell>
    </form>
  );
}

/** Live-Anforderung unter einem Feld: Häkchen wird accent, sobald erfüllt. */
function Req({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      className={`-mt-1 flex items-start gap-1.5 px-1 text-xs leading-snug transition-colors ${
        ok ? "text-accent-ink" : "text-ink-subtle"
      }`}
    >
      <span
        className={`mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          ok
            ? "border-accent bg-accent text-on-accent"
            : "border-line-strong text-transparent"
        }`}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {children}
    </p>
  );
}

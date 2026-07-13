"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AuthShell } from "../../components/auth/AuthShell";
import { FloatingField } from "../../components/auth/FloatingField";
import { PasswordField } from "../../components/auth/PasswordField";
import { AuthSubmit } from "../../components/auth/AuthSubmit";
import type { MascotState } from "../../components/mascot/Mascot";
import { login } from "./actions";

export function LoginForm({ next, error }: { next: string; error: boolean }) {
  return (
    <form
      action={login}
      className="relative mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center"
    >
      <input type="hidden" name="next" value={next} />
      <LoginStage error={error} />
    </form>
  );
}

function LoginStage({ error }: { error: boolean }) {
  const { pending } = useFormStatus();
  const [active, setActive] = useState<null | "user" | "pass">(null);
  const [reveal, setReveal] = useState(false);
  const [typed, setTyped] = useState(false);
  // Startet true, wenn die Seite mit ?error=1 geladen wurde (error ändert sich
  // ohne Reload nicht). Der Effect schüttelt Pott ~1,5 s und beruhigt ihn dann;
  // die Meldung selbst bleibt sichtbar, bis der Nutzer tippt.
  const [errShake, setErrShake] = useState(error);
  useEffect(() => {
    if (!errShake) return;
    const t = setTimeout(() => setErrShake(false), 1500);
    return () => clearTimeout(t);
  }, [errShake]);

  const showError = error && !typed;

  const state: MascotState = errShake
    ? "error"
    : active === "pass"
      ? reveal
        ? "peekingOpen" // Passwort sichtbar → Spalt offen, Pott lugt
        : "peeking" // Passwort verdeckt → Hände bedecken beide Augen
      : active === "user"
        ? "watching"
        : "idle";

  const onFocus = (which: "user" | "pass") => () => setActive(which);

  return (
    <AuthShell
      state={state}
      title="Willkommen zurück"
      subtitle="Schön, dass du wieder am Herd bist."
      footer={
        <p className="mt-6 text-center text-sm text-ink-subtle">
          Noch kein Konto?{" "}
          <Link
            href="/register"
            className="font-medium text-accent-ink underline-offset-2 hover:underline"
          >
            Registrieren
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-3">
        <FloatingField
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          label="Benutzername"
          onFocus={onFocus("user")}
          onBlur={() => setActive(null)}
          onInput={() => setTyped(true)}
        />

        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          required
          reveal={reveal}
          onToggleReveal={() => setReveal((v) => !v)}
          onFocus={onFocus("pass")}
          onBlur={() => setActive(null)}
          onInput={() => setTyped(true)}
        />

        {showError ? (
          <p
            role="alert"
            className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink"
          >
            Benutzername oder Passwort falsch — versuch&apos;s nochmal.
          </p>
        ) : null}

        <AuthSubmit pending={pending}>
          {pending ? "Wird angemeldet …" : "Anmelden"}
        </AuthSubmit>
      </div>
    </AuthShell>
  );
}

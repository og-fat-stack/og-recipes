"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Mascot, type MascotState } from "../../components/mascot/Mascot";
import { login } from "./actions";

const fieldInput =
  "peer w-full rounded-control border border-line-strong bg-surface px-3.5 pb-2 pt-6 text-base text-ink outline-none transition-colors focus:border-accent";
const fieldLabel =
  "pointer-events-none absolute left-3.5 top-2 text-xs font-medium text-ink-subtle transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-accent-ink";
const fieldUnderline =
  "pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-accent transition-transform duration-200 peer-focus:scale-x-100";

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
  const [filled, setFilled] = useState({ user: false, pass: false });
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

  const warmth = ((filled.user ? 1 : 0) + (filled.pass ? 1 : 0)) as 0 | 1 | 2;
  const showError = error && !typed;

  const state: MascotState = pending
    ? "celebrate"
    : errShake
      ? "error"
      : active === "pass"
        ? reveal
          ? "peekingOpen" // Passwort sichtbar → Spalt offen, Pott lugt
          : "peeking" // Passwort verdeckt → Hände bedecken beide Augen
        : active === "user"
          ? "watching"
          : "idle";

  const onFocus = (which: "user" | "pass") => () => setActive(which);
  const markTyped = (which: "user" | "pass", value: string) => {
    setTyped(true);
    setFilled((f) => ({ ...f, [which]: value.length > 0 }));
  };

  return (
    <>
      {/* Ambiente: weiche Farbwolken hinter der Karte */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-16 top-16 h-48 w-48 rounded-full bg-accent-surface opacity-60 blur-3xl" />
        <div className="absolute -right-12 bottom-16 h-44 w-44 rounded-full bg-warn-surface opacity-50 blur-3xl" />
      </div>

      <div className="relative mt-16">
        <div
          aria-hidden
          className="absolute -top-20 left-1/2 z-10 h-32 w-32 -translate-x-1/2"
        >
          <Mascot state={state} warmth={warmth} className="h-full w-full" />
        </div>

        <div className="relative rounded-card border border-line bg-surface px-6 pb-6 pt-16 shadow-sm">
          <div className="mb-5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-accent" />
              og-recipes
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Willkommen zurück
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Schön, dass du wieder am Herd bist.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                id="username"
                name="username"
                type="text"
                placeholder=" "
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
                className={fieldInput}
                onFocus={onFocus("user")}
                onBlur={() => setActive(null)}
                onInput={(e) => markTyped("user", e.currentTarget.value)}
              />
              <label htmlFor="username" className={fieldLabel}>
                Benutzername
              </label>
              <span className={fieldUnderline} />
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={reveal ? "text" : "password"}
                placeholder=" "
                autoComplete="current-password"
                required
                className={`${fieldInput} pr-11`}
                onFocus={onFocus("pass")}
                onBlur={() => setActive(null)}
                onInput={(e) => markTyped("pass", e.currentTarget.value)}
              />
              <label htmlFor="password" className={fieldLabel}>
                Passwort
              </label>
              <span className={fieldUnderline} />
              <button
                type="button"
                // Fokus im Passwortfeld halten: sonst blurrt das Feld beim Klick,
                // active → null und Pott verlässt peeking/peekingOpen. preventDefault
                // im mousedown verhindert den Fokuswechsel; onClick toggelt trotzdem.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute inset-y-0 right-0 z-10 flex items-center px-3.5 text-ink-subtle outline-none transition-colors hover:text-ink-muted focus-visible:text-ink-muted"
              >
                <EyeIcon off={reveal} />
              </button>
            </div>

            {showError ? (
              <p
                role="alert"
                className="rounded-control border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-surface-ink"
              >
                Benutzername oder Passwort falsch — versuch&apos;s nochmal.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70"
            >
              {pending ? "Wird angemeldet …" : "Anmelden"}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-subtle">
        Noch kein Konto?{" "}
        <Link
          href="/register"
          className="font-medium text-accent-ink underline-offset-2 hover:underline"
        >
          Registrieren
        </Link>
      </p>
    </>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  );
}

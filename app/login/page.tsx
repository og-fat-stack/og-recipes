import Link from "next/link";
import { redirect } from "next/navigation";
import { hasValidSession } from "../../lib/auth";
import { PasswordInput } from "../../components/PasswordInput";
import { login } from "./actions";

const inputClass =
  "rounded-control border border-line-strong bg-surface px-3 py-2 text-base outline-none focus:border-line-active";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await hasValidSession()) redirect("/");
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Anmelden</h1>
      <form action={login} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <label htmlFor="username" className="text-sm font-medium">
          Benutzername
        </label>
        <input
          id="username"
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          className={inputClass}
        />
        <label htmlFor="password" className="text-sm font-medium">
          Passwort
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        {sp.error ? (
          <p className="text-sm text-danger-ink">
            Benutzername oder Passwort falsch.
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-1 rounded-control bg-contrast px-4 py-2 text-sm font-medium text-on-contrast hover:bg-contrast-hover"
        >
          Anmelden
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-subtle">
        Noch kein Konto?{" "}
        <Link href="/register" className="underline">
          Registrieren
        </Link>
      </p>
    </div>
  );
}

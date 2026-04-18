import { redirect } from "next/navigation";
import { hasValidSession } from "../../lib/auth";
import { login } from "./actions";

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
        <label htmlFor="password" className="text-sm font-medium">
          Passwort
        </label>
        <input
          id="password"
          type="password"
          name="password"
          autoFocus
          required
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {sp.error ? (
          <p className="text-sm text-red-600">Falsches Passwort.</p>
        ) : null}
        <button
          type="submit"
          className="mt-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Anmelden
        </button>
      </form>
    </div>
  );
}

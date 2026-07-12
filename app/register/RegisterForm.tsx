"use client";

import { useActionState } from "react";
import { PasswordInput } from "../../components/PasswordInput";
import { register, type RegisterState } from "./actions";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    register,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="name" className="text-sm font-medium">
        Name
      </label>
      <input
        id="name"
        type="text"
        name="name"
        autoComplete="name"
        autoFocus
        required
        className={inputClass}
      />
      <label htmlFor="username" className="text-sm font-medium">
        Benutzername
      </label>
      <input
        id="username"
        type="text"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        pattern="[A-Za-z0-9._\-]+"
        minLength={2}
        maxLength={30}
        required
        className={inputClass}
      />
      <label htmlFor="password" className="text-sm font-medium">
        Passwort (min. 8 Zeichen)
      </label>
      <PasswordInput
        id="password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        className={inputClass}
      />
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Wird erstellt …" : "Konto erstellen"}
      </button>
    </form>
  );
}

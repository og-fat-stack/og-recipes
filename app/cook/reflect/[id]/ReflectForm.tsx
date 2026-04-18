"use client";

import { useActionState } from "react";
import {
  saveReflection,
  type SaveReflectionState,
} from "../../actions";

export function ReflectForm({ sessionId }: { sessionId: number }) {
  const boundAction = saveReflection.bind(null, sessionId);
  const [state, action, pending] = useActionState<
    SaveReflectionState,
    FormData
  >(boundAction, {});

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Bewertung
        </legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 has-[:checked]:bg-amber-400 has-[:checked]:border-amber-400 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                required
                className="sr-only"
              />
              {"★".repeat(n)}
              {"☆".repeat(5 - n)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Was lief gut?</span>
        <textarea
          name="wentWell"
          rows={4}
          placeholder="z. B. Zwiebeln waren perfekt karamellisiert, Würzung hat gepasst"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Was lief nicht gut?
        </span>
        <textarea
          name="wentWrong"
          rows={4}
          placeholder="z. B. Reis war etwas zu trocken, Hähnchen minimal rosa"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {state.error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Claude fasst zusammen..." : "Reflexion speichern"}
      </button>
    </form>
  );
}

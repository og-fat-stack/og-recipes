"use client";

import { useActionState } from "react";
import { saveClaudeMemory, type SaveMemoryState } from "./actions";

export function MemoryForm({
  content,
  updatedAt,
}: {
  content: string;
  updatedAt: Date | null;
}) {
  const [state, formAction, pending] = useActionState<
    SaveMemoryState,
    FormData
  >(saveClaudeMemory, {});

  const formKey = updatedAt ? new Date(updatedAt).getTime().toString() : "new";

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Notizen für Claude
        </span>
        <textarea
          name="content"
          defaultValue={content}
          rows={14}
          maxLength={8000}
          placeholder="z. B. Vorlieben, Abneigungen, Allergien, Ausstattung (Topf-/Pfannengröße), Lieblingsküchen ..."
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm leading-relaxed shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
      </label>

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
        {pending ? "Speichern..." : "Memory speichern"}
      </button>
    </form>
  );
}

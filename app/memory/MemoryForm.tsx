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
        <span className="text-ink-muted">
          Notizen für Claude
        </span>
        <textarea
          name="content"
          defaultValue={content}
          rows={14}
          maxLength={8000}
          placeholder="z. B. Vorlieben, Abneigungen, Allergien, Ausstattung (Topf-/Pfannengröße), Lieblingsküchen ..."
          className="rounded-control border border-line-strong bg-surface px-3 py-2 font-mono text-base leading-relaxed shadow-sm focus:border-contrast focus:outline-none"
        />
      </label>

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
        {pending ? "Speichern..." : "Memory speichern"}
      </button>
    </form>
  );
}

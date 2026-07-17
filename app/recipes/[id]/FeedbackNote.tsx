"use client";

import { useActionState } from "react";
import { saveRecipeFeedback, type FeedbackState } from "../actions";

export function FeedbackNote({
  recipeId,
  note,
}: {
  recipeId: number;
  note: string | null;
}) {
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(
    saveRecipeFeedback,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="recipeId" value={recipeId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-muted">
          Wie war&apos;s? Was würdest du beim nächsten Mal ändern?
        </span>
        <textarea
          name="feedbackNote"
          defaultValue={note ?? ""}
          rows={3}
          maxLength={2000}
          placeholder="z. B. richtig lecker, aber nächstes Mal mehr Zitrone — war etwas fad"
          className="rounded-control border border-line-strong bg-surface px-3 py-2 text-base leading-relaxed shadow-sm focus:border-contrast focus:outline-none"
        />
      </label>
      {state.error && <p className="text-sm text-danger-ink">{state.error}</p>}
      {state.ok && <p className="text-sm text-accent-ink">Gespeichert.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-contrast px-5 py-2 text-sm font-medium text-on-contrast transition-colors hover:bg-contrast-hover disabled:opacity-50"
      >
        {pending ? "Speichern..." : "Notiz speichern"}
      </button>
    </form>
  );
}

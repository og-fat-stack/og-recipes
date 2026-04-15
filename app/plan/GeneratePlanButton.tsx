"use client";

import { useActionState } from "react";
import {
  generateWeeklyPlan,
  type GeneratePlanState,
} from "./actions";

export function GeneratePlanButton({ hasPlan }: { hasPlan: boolean }) {
  const [state, action, pending] = useActionState<
    GeneratePlanState,
    FormData
  >(generateWeeklyPlan, { status: "idle" });

  return (
    <form action={action} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending
          ? "Claude plant die Woche..."
          : hasPlan
            ? "Woche neu generieren"
            : "✨ Woche generieren"}
      </button>
      {state.status === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}

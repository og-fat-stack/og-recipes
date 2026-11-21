"use client";

import { useState, useTransition } from "react";
import { recomputeRecipeNutrition } from "../actions";

export function RecomputeNutritionButton({ recipeId }: { recipeId: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await recomputeRecipeNutrition(recipeId);
            if (res.error) setError(res.error);
          })
        }
        className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50"
      >
        {pending ? "Rechne nach..." : "Mit BLS nachrechnen"}
      </button>
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  );
}

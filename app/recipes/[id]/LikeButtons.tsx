"use client";

import { useTransition } from "react";
import { setRecipeLiked } from "../actions";

export function LikeButtons({
  recipeId,
  liked,
}: {
  recipeId: number;
  liked: boolean | null;
}) {
  const [pending, start] = useTransition();

  function toggle(value: boolean) {
    start(() => setRecipeLiked(recipeId, liked === value ? null : value));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-pressed={liked === true}
        onClick={() => toggle(true)}
        className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
          liked === true
            ? "border-accent bg-accent text-on-accent"
            : "border-line-strong text-ink-muted hover:bg-surface-subtle"
        }`}
      >
        👍
      </button>
      <button
        type="button"
        disabled={pending}
        aria-pressed={liked === false}
        onClick={() => toggle(false)}
        className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
          liked === false
            ? "border-danger-line bg-danger-surface text-danger-ink"
            : "border-line-strong text-ink-muted hover:bg-surface-subtle"
        }`}
      >
        👎
      </button>
    </div>
  );
}

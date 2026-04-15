"use client";

import { useTransition } from "react";
import { deleteWaterEntry } from "./actions";

export function DeleteEntryButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Eintrag löschen"
      disabled={pending}
      onClick={() => start(() => deleteWaterEntry(id).then(() => {}))}
      className="rounded-full px-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
    >
      ×
    </button>
  );
}

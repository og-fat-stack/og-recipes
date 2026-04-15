"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addWater, deleteWaterEntry, undoLastWater } from "./actions";

const PRESETS = [250, 500, 750] as const;
const UNDO_MS = 5000;

type Toast = { id: number; ml: number };

export function WaterControls({ compact = false }: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), UNDO_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [toast]);

  const add = (ml: number) => {
    start(async () => {
      const res = await addWater(ml);
      if (res) setToast(res);
    });
  };

  const undo = () => {
    if (!toast) return;
    const id = toast.id;
    setToast(null);
    start(() => deleteWaterEntry(id).then(() => {}));
  };

  return (
    <div className="relative">
      <div className={"flex flex-wrap gap-2 " + (compact ? "" : "mt-4")}>
        {PRESETS.map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={pending}
            onClick={() => add(ml)}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            +{ml} ml
          </button>
        ))}
        {!compact && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => undoLastWater().then(() => {}))}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Undo last
          </button>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          <span>+{toast.ml} ml logged</span>
          <button
            type="button"
            onClick={undo}
            className="font-semibold text-sky-300 hover:text-sky-200 dark:text-sky-600 dark:hover:text-sky-700"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

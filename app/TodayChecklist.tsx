"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleDailyCheck } from "./checklistActions";
import type { ChecklistItem } from "../lib/checklist";

export function TodayChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((item) => (
        <Row key={item.key} item={item} />
      ))}
    </ul>
  );
}

function Row({ item }: { item: ChecklistItem }) {
  const [pending, start] = useTransition();

  const box = (
    <span
      className={
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm transition-colors " +
        (item.done
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 text-transparent dark:border-zinc-600")
      }
    >
      ✓
    </span>
  );

  const content = (
    <>
      {box}
      <span className="flex flex-col">
        <span
          className={
            "text-sm font-medium " +
            (item.done ? "text-zinc-400 line-through dark:text-zinc-500" : "")
          }
        >
          {item.label}
        </span>
        {item.sublabel && (
          <span className="text-xs text-zinc-500">{item.sublabel}</span>
        )}
      </span>
    </>
  );

  // Auto-Items spiegeln Daten wider → kein manuelles Umschalten, nur Verlinkung.
  if (item.auto) {
    return (
      <li>
        <Link
          href={item.href ?? "#"}
          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          {content}
          {item.href && (
            <span className="ml-auto text-xs text-zinc-400">→</span>
          )}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => toggleDailyCheck(item.key, !item.done))}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-800/50"
      >
        {content}
      </button>
    </li>
  );
}

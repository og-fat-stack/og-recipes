"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleDailyCheck } from "./checklistActions";
import type { ChecklistItem } from "../lib/checklist";

export function TodayChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-surface">
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
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-control border text-sm transition-colors " +
        (item.done
          ? "border-accent bg-accent text-on-accent"
          : "border-line-strong text-transparent")
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
            (item.done ? "text-ink-subtle line-through" : "")
          }
        >
          {item.label}
        </span>
        {item.sublabel && (
          <span className="text-xs text-ink-subtle">{item.sublabel}</span>
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
          className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover"
        >
          {content}
          {item.href && (
            <span className="ml-auto text-xs text-ink-subtle">→</span>
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
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover disabled:opacity-60"
      >
        {content}
      </button>
    </li>
  );
}

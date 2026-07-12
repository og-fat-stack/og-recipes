import { connection } from "next/server";
import { requireUserId } from "../../lib/auth";
import { getClaudeMemory } from "../../lib/claudeMemory";
import { MemoryForm } from "./MemoryForm";

export default async function MemoryPage() {
  await connection();
  const userId = await requireUserId();
  const memory = await getClaudeMemory(userId);
  const content = memory?.content ?? "";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Claude-Memory</h1>
        <p className="mt-1 text-ink-muted">
          Was Claude beim Erstellen von Rezepten und Wochenplänen über dich
          wissen soll — Vorlieben, Abneigungen, Allergien, Küchen-Ausstattung.
          Wird in jeden Generierungs-Prompt eingespeist.
        </p>
      </header>

      {!memory && (
        <p className="rounded-card border border-warn-line bg-warn-surface p-3 text-sm text-warn-surface-ink">
          Noch nichts gespeichert — Claude kennt bisher keine Vorlieben von
          dir. Trag ein, was beim Kochen und Planen berücksichtigt werden soll.
        </p>
      )}

      <MemoryForm content={content} updatedAt={memory?.updatedAt ?? null} />
    </div>
  );
}

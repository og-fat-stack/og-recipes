import { db } from "./db";

/**
 * Frei editierbares "Gedächtnis" für Claude: persönliche Vorlieben, Abneigungen
 * und Hinweise, die in jeden Rezept- und Planungs-Prompt eingespeist werden.
 * Eine Zeile pro Nutzer.
 */

/** Neutraler Prompt-Fallback, solange der Nutzer noch nichts gespeichert hat. */
export const DEFAULT_CLAUDE_MEMORY =
  "Keine besonderen Vorlieben, Abneigungen oder Einschränkungen bekannt.";

export async function getClaudeMemory(userId: number) {
  return db.claudeMemory.findUnique({ where: { userId } });
}

/**
 * Der Memory-Text fürs Prompt-Einspeisen. Fällt auf einen neutralen Text
 * zurück, solange der Nutzer noch nichts gespeichert hat.
 */
export async function getClaudeMemoryText(userId: number): Promise<string> {
  const row = await getClaudeMemory(userId);
  const content = row?.content?.trim();
  return content && content.length > 0 ? content : DEFAULT_CLAUDE_MEMORY;
}

import { db } from "./db";

/**
 * Frei editierbares "Gedächtnis" für Claude: persönliche Vorlieben, Abneigungen
 * und Hinweise, die in jeden Rezept- und Planungs-Prompt eingespeist werden.
 * Singleton-Zeile (id = 1).
 */

export const DEFAULT_CLAUDE_MEMORY = `Vorlieben & Abneigungen:
- Gekochte Tomaten mag ich nur, wenn sie zu einer Soße verarbeitet sind (z. B. Passata, Tomatensoße, Schmorbasis). Gekochte Tomatenstücke, die nicht zu Soße zerfallen, mag ich nicht. Kalte/rohe Tomaten sind in Ordnung.
- Paprika (das Gemüse) mag ich gar nicht — weder gekocht noch roh/fest. Bitte nicht als Zutat verwenden.
- Paprikapulver als Gewürz ist dagegen gut und gerne genutzt.

Ausstattung:
- Meine Töpfe und Pfannen sind nur begrenzt groß: Es passen maximal 3 Hähnchenschenkel nebeneinander auf die Pfannenoberfläche. Größere Mengen daher in mehreren Durchgängen anbraten (Pfanne nicht überfüllen, sonst Dampf statt Kruste) und in den Schritten darauf hinweisen.`;

export async function getClaudeMemory() {
  return db.claudeMemory.findUnique({ where: { id: 1 } });
}

/**
 * Der Memory-Text fürs Prompt-Einspeisen. Fällt auf die Standard-Vorlieben
 * zurück, solange der Nutzer noch nichts gespeichert hat.
 */
export async function getClaudeMemoryText(): Promise<string> {
  const row = await getClaudeMemory();
  const content = row?.content?.trim();
  return content && content.length > 0 ? content : DEFAULT_CLAUDE_MEMORY;
}

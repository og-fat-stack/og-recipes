/**
 * Fehler aus der Claude-Generierung, der die Roh-Antwort mitträgt. Die
 * Generatoren (lib/ai/*) werfen ihn bei Parse-/Validierungsfehlern; die
 * Server-Actions fangen ihn und persistieren die Roh-Antwort über
 * lib/generationLog.ts — sonst wäre das wertvollste Diagnose-Material
 * (was Claude tatsächlich geantwortet hat) mit dem Request verloren.
 */
export class GenerationError extends Error {
  rawResponse?: string;
  stopReason?: string;

  constructor(
    message: string,
    opts?: { rawResponse?: string; stopReason?: string | null },
  ) {
    super(message);
    this.name = "GenerationError";
    this.rawResponse = opts?.rawResponse;
    this.stopReason = opts?.stopReason ?? undefined;
  }
}

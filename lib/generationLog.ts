import { db } from "./db";
import { GenerationError } from "./ai/generationError";

/** Roh-Antworten können lang sein (Wochenplan bis ~20k Tokens) — großzügig
 * cappen, damit eine Ausreißer-Antwort die Tabelle nicht sprengt. */
const MAX_RAW_CHARS = 100_000;
const RETENTION_DAYS = 180;

/**
 * Persistiert eine fehlgeschlagene Generierung als Diagnose-Eintrag.
 * Darf selbst NIE werfen — Logging-Probleme dürfen den eigentlichen
 * Fehlerpfad (Status setzen, Nutzer informieren) nicht verdecken.
 */
export async function logGenerationFailure(
  userId: number,
  kind: "plan" | "recipe",
  error: unknown,
  promptVersion?: string,
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const gen = error instanceof GenerationError ? error : null;
    await db.generationLog.create({
      data: {
        userId,
        kind,
        promptVersion: promptVersion ?? null,
        error: message.slice(0, 4000),
        stopReason: gen?.stopReason ?? null,
        rawResponse: gen?.rawResponse
          ? gen.rawResponse.slice(0, MAX_RAW_CHARS)
          : null,
      },
    });
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await db.generationLog.deleteMany({
      where: { userId, createdAt: { lt: cutoff } },
    });
  } catch (e) {
    console.error("GenerationLog konnte nicht geschrieben werden:", e);
  }
}

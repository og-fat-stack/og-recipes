import Anthropic from "@anthropic-ai/sdk";

// `planner` (Claude Sonnet 5) für die Wochenplan-Generierung — läuft im
// Hintergrund (siehe app/plan/actions.ts, `after()`), `smart` (Sonnet 4.6) als
// Standard, `fast` (Haiku 4.5) für günstige On-Demand-Aufrufe.
export const MODELS = {
  planner: "claude-sonnet-5",
  smart: "claude-sonnet-4-6",
  fast: "claude-haiku-4-5-20251001",
} as const;

type ModelKey = keyof typeof MODELS;
export type Effort = "low" | "medium" | "high" | "max";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type CallClaudeInput = {
  model?: ModelKey;
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  /** Claude Sonnet 5 (und die 4.7/4.8-Opus-Familie) lehnen nicht-default
   * Sampling-Parameter ab — nur setzen, wenn das Zielmodell sie unterstützt
   * (Sonnet 4.6 / Haiku 4.5). Weglassen statt eines Default-Werts. */
  temperature?: number;
  /** Denktiefe/Token-Aufwand (Claude Sonnet 5 und neuere Opus-Modelle). */
  effort?: Effort;
};

/**
 * Shared Claude call wrapper. The system prompt is sent as a cache-control
 * block so repeated calls with the same system text hit the prompt cache.
 */
export async function callClaude({
  model = "smart",
  system,
  messages,
  maxTokens = 2048,
  temperature,
  effort,
}: CallClaudeInput): Promise<Anthropic.Message> {
  return anthropic().messages.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(effort ? { output_config: { effort } } : {}),
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });
}

export function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

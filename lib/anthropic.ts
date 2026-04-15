import Anthropic from "@anthropic-ai/sdk";

// Claude 4.6 family (+ Haiku 4.5). Use `planner` for heavy reasoning
// (weekly plan generation), `smart` as the default, `fast` for cheap
// on-demand calls like step tips and tag explainers.
export const MODELS = {
  planner: "claude-opus-4-6",
  smart: "claude-sonnet-4-6",
  fast: "claude-haiku-4-5-20251001",
} as const;

type ModelKey = keyof typeof MODELS;

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
  temperature?: number;
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
  temperature = 0.7,
}: CallClaudeInput): Promise<Anthropic.Message> {
  return anthropic().messages.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    temperature,
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

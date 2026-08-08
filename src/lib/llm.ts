// ============================================================
// LLM API wrapper — single entry point for all LLM calls
// Provider: Anthropic Claude (claude-3-5-haiku-20241022 default)
// ============================================================
// Reads ANTHROPIC_API_KEY from env.
// Implements exponential back-off retry for transient errors.
// Maps provider responses to the shared LLMResponse shape.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  text: string;
  /** Raw provider response — kept for debugging */
  raw?: unknown;
}

// --------------- Constants --------------------------------

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

// --------------- Client singleton ------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env before using the LLM."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// --------------- Retry helper ----------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof Anthropic.APIError &&
        (err.status === 429 || err.status >= 500);
      if (!isRetryable || attempt === retries - 1) throw err;
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      logger.warn("llm: retrying after error", {
        attempt: attempt + 1,
        delay,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// --------------- Public API ------------------------------

/**
 * Send a conversation to Claude and return the response text.
 *
 * System messages are extracted and passed as Anthropic's top-level
 * `system` field.  User/assistant messages are passed in the messages array.
 */
export async function callLLM(
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const client = getClient();

  const model = options?.model ?? DEFAULT_MODEL;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

  // Anthropic separates system prompt from conversation messages.
  const systemMessages = messages.filter((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const systemPrompt =
    systemMessages.length > 0
      ? systemMessages.map((m) => m.content).join("\n\n")
      : undefined;

  // Anthropic SDK requires at least one user message.
  if (conversationMessages.length === 0) {
    throw new Error("callLLM: at least one non-system message is required.");
  }

  const response = await withRetry(() =>
    client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: conversationMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    })
  );

  const text =
    response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("") ?? "";

  return { text, raw: response };
}

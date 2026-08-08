// ============================================================
// LLM API wrapper — single entry point for all LLM calls
// Provider: Groq (llama-3.3-70b-versatile default)
// ============================================================
// Reads GROQ_API_KEY from env.
// Implements exponential back-off retry for transient errors.
// Maps provider responses to the shared LLMResponse shape.
// ============================================================

import Groq from "groq-sdk";
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

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

// --------------- Client singleton ------------------------

let _client: Groq | null = null;

function getClient(): Groq {
  if (_client) return _client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env before using the LLM."
    );
  }
  _client = new Groq({ apiKey });
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
        err instanceof Groq.APIError &&
        (err.status === 429 || (err.status && err.status >= 500));
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
 * Send a conversation to Groq and return the response text.
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

  // Groq requires at least one non-system message.
  const conversationMessages = messages.filter((m) => m.role !== "system");
  if (conversationMessages.length === 0) {
    throw new Error("callLLM: at least one non-system message is required.");
  }

  const response = await withRetry(() =>
    client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    })
  );

  const text = response.choices[0]?.message?.content ?? "";

  return { text, raw: response };
}

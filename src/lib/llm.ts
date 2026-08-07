// ============================================================
// LLM API wrapper — single entry point for all LLM calls
// (Claude / other providers)
// ============================================================
// TODO (Milestone 3 – Writer / Curator): Implement real LLM integration.
// - Add API key config (ANTHROPIC_API_KEY or similar) to .env
// - Implement retry / back-off logic
// - Map provider responses to LLMResponse shape below

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  text: string;
  /** Raw provider response — kept for debugging */
  raw?: unknown;
}

/**
 * Send a conversation to the configured LLM and return the response text.
 *
 * TODO: implement actual API call.
 */
export async function callLLM(
  messages: LLMMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<LLMResponse> {
  // TODO (Milestone 3): Replace with real provider SDK call.
  void messages;
  void options;
  throw new Error("LLM integration not yet implemented — see TODO in src/lib/llm.ts");
}

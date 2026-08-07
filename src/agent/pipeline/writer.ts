// ============================================================
// Writer — post generation stage
// ============================================================
// Generates the post text in the persona's voice using researched
// facts, and writes a rationale string explaining why the topic
// was chosen and why it matters right now.
//
// Does NOT decide whether to publish — that is the critic's job.
//
// TODO (Milestone 3 – Writer): Implement LLM-based post generation.

import type { DraftResult, Persona, ResearchResult } from "@/types/agent";

/**
 * Draft a post from researched facts in the persona's voice.
 *
 * @param research - Facts + sources from the researcher stage
 * @param persona  - Persona config for voice conditioning
 * @returns        { text, rationale }
 *
 * TODO (Milestone 3):
 *   1. Build a system prompt from persona.voiceRules (banned phrases, tone, style)
 *   2. Build a user prompt from research.facts, formatted with source URLs
 *   3. Call lib/llm.callLLM() with system + user messages
 *   4. Parse the LLM response into { text, rationale }
 *   5. Validate banned phrases are absent from text — if found, request a rewrite
 */
export async function draft(
  research: ResearchResult,
  persona: Persona
): Promise<DraftResult> {
  // TODO (Milestone 3): Replace stub with real implementation.
  void research;
  void persona;
  throw new Error("writer.draft not yet implemented — see TODO in src/agent/pipeline/writer.ts");
}

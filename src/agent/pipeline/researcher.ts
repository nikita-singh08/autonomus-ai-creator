// ============================================================
// Researcher — fact extraction + source binding stage
// ============================================================
// Fetches the full article text for the chosen topic, extracts
// facts, and binds each fact to its source URL.
//
// Does NOT judge quality, score, or write the post.
//
// TODO (Milestone 3 – Researcher): Implement web fetch + LLM fact extraction.

import type { CandidateTopic, ResearchResult } from "@/types/agent";

/**
 * Gather facts and source bindings for the chosen topic.
 *
 * @param topic - The curator-selected topic to research
 * @returns     { facts[], sources[] } — facts bound to source URLs
 *
 * TODO (Milestone 3):
 *   1. Fetch full HTML/text of topic.url (use fetch() or a scraper lib)
 *   2. Use lib/llm.callLLM() to extract atomic facts from the article body
 *   3. Bind each extracted fact to topic.url as its sourceUrl
 *   4. Optionally follow outbound reference links and extract additional facts
 *   5. Return ResearchResult with deduped facts and all visited sources
 */
export async function gather(topic: CandidateTopic): Promise<ResearchResult> {
  // TODO (Milestone 3): Replace stub with real implementation.
  void topic;
  throw new Error("researcher.gather not yet implemented — see TODO in src/agent/pipeline/researcher.ts");
}

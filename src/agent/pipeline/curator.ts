// ============================================================
// Curator — editorial judgment / scoring stage
// ============================================================
// Scores candidate topics for relevance, novelty, and timeliness.
// Picks the best candidate or returns null to signal "skip this cycle".
//
// Does NOT fetch content, write posts, or publish anything.
//
// TODO (Milestone 3 – Curator): Implement scoring + LLM-based judgment.

import type { CandidateTopic, CuratorResult, Persona, Post } from "@/types/agent";

/**
 * Score and select the best candidate topic for this tick.
 *
 * @param candidates  - Topics discovered by the scout
 * @param recentPosts - Recent posts used for novelty/dedupe check
 * @param persona     - Current persona for relevance scoring
 * @returns           { chosenTopic, reasoning } — chosenTopic is null if skipping
 *
 * TODO (Milestone 3):
 *   1. Score each candidate on: pillar relevance, timeliness, novelty vs. recentPosts
 *   2. Use lib/llm.callLLM() to apply persona-aware editorial judgment
 *   3. If top score < threshold → return { chosenTopic: null, reasoning: "..." }
 *   4. Otherwise return winning topic + rationale string
 */
export async function judge(
  candidates: CandidateTopic[],
  recentPosts: Post[],
  persona: Persona
): Promise<CuratorResult> {
  // TODO (Milestone 3): Replace stub with real implementation.
  void candidates;
  void recentPosts;
  void persona;
  throw new Error("curator.judge not yet implemented — see TODO in src/agent/pipeline/curator.ts");
}

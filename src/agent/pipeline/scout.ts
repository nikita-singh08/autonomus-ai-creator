// ============================================================
// Scout — topic discovery stage
// ============================================================
// Fetches RSS/live sources based on persona pillars, deduplicates
// against recently seen topic URLs, and returns candidate topics.
//
// Does NOT score, judge, or rank topics.
//
// TODO (Milestone 3 – Scout): Implement real RSS fetch + dedupe logic.

import type { CandidateTopic, Persona } from "@/types/agent";

/**
 * Discover candidate topics aligned with the persona's pillars.
 *
 * @param persona  - Current persona config (pillars, antiTopics, domain)
 * @param seenUrls - URLs already seen in recent memory (for dedupe)
 * @returns        Array of candidate topics to pass to the curator
 *
 * TODO (Milestone 3):
 *   1. Load feed URLs from src/config/sources.ts matching persona.pillars
 *   2. Call lib/rss.fetchFeeds() to retrieve items
 *   3. Filter out URLs present in seenUrls
 *   4. Filter out items whose titles match persona.antiTopics
 *   5. Return the cleaned candidate list
 */
export async function discover(
  persona: Persona,
  seenUrls: string[]
): Promise<CandidateTopic[]> {
  // TODO (Milestone 3): Replace stub with real implementation.
  void persona;
  void seenUrls;
  throw new Error("scout.discover not yet implemented — see TODO in src/agent/pipeline/scout.ts");
}

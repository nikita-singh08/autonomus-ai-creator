// ============================================================
// Critic — integrity gate stage
// ============================================================
// Runs integrity checks on the drafted post before it is published:
//   1. Quotation percentage (text must not be >N% quoted)
//   2. Cosine similarity vs. recent posts (repetition gate)
//   3. Citation validity (all source URLs reachable)
//
// Does NOT generate content or make topic decisions.
//
// TODO (Milestone 3 – Critic): Implement integrity checks.

import type { CriticResult, DraftResult, Post, PostSource } from "@/types/agent";

/**
 * Evaluate a drafted post against integrity gates.
 *
 * @param draft       - The writer's output: { text, rationale }
 * @param recentPosts - Past posts to check similarity against
 * @param sources     - Sources to validate for reachability
 * @returns           { pass: boolean, reason: string }
 *
 * TODO (Milestone 3):
 *   1. Compute quotation % of draft.text — fail if > threshold
 *   2. Use lib/similarity.isTooSimilar() vs. recentPosts — fail if too close
 *   3. HEAD-check each source URL — fail if any return 4xx/5xx
 *   4. If all gates pass → return { pass: true, reason: "all gates passed" }
 *   5. Otherwise → return { pass: false, reason: "<first failure description>" }
 */
export async function evaluate(
  draft: DraftResult,
  recentPosts: Post[],
  sources: PostSource[]
): Promise<CriticResult> {
  // TODO (Milestone 3): Replace stub with real implementation.
  void draft;
  void recentPosts;
  void sources;
  throw new Error("critic.evaluate not yet implemented — see TODO in src/agent/pipeline/critic.ts");
}

// ============================================================
// TF-IDF / cosine similarity utility for repetition detection
// ============================================================
// TODO (Milestone 3 – Critic): Implement TF-IDF vectorisation and cosine
// similarity. Used by the critic stage to gate posts that are too similar
// to recently published content.

/**
 * Compute cosine similarity between two strings using TF-IDF term vectors.
 * Returns a value in [0, 1] — 1 means identical, 0 means no overlap.
 *
 * TODO: implement actual TF-IDF + cosine computation.
 */
export function cosineSimilarity(_a: string, _b: string): number {
  // TODO (Milestone 3): Replace stub with real implementation.
  throw new Error("Similarity not yet implemented — see TODO in src/lib/similarity.ts");
}

/**
 * Check whether `candidate` is too similar to any of `existingTexts`.
 * Returns true if the max cosine similarity exceeds `threshold`.
 *
 * TODO: implement after cosineSimilarity is ready.
 */
export function isTooSimilar(
  candidate: string,
  existingTexts: string[],
  threshold = 0.7
): boolean {
  // TODO (Milestone 3): Replace stub with real implementation.
  void candidate;
  void existingTexts;
  void threshold;
  throw new Error("Similarity not yet implemented — see TODO in src/lib/similarity.ts");
}

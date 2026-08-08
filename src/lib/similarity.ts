// ============================================================
// TF-IDF / cosine similarity utility for repetition detection
// ============================================================
// Used by the Critic stage to gate posts that are too similar
// to recently published content.
//
// Implementation: term-frequency vectors with inverse-document-
// frequency weighting computed over the comparison corpus.
// Cosine similarity between two TF-IDF vectors gives a score in
// [0, 1] — 1 means identical, 0 means no shared vocabulary.
// ============================================================

// --------------- Stop words ------------------------------

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
  "for", "of", "with", "by", "from", "as", "is", "it", "its",
  "was", "are", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "shall", "can", "that", "this", "these", "those", "i",
  "we", "you", "he", "she", "they", "not", "no", "so", "if",
  "than", "then", "just", "more", "also", "up", "out", "about",
  "into", "over", "after", "their", "our", "your", "my", "his",
  "her", "its", "which", "who", "how", "what", "when", "where",
  "there", "here", "all", "each", "any", "some", "new", "one",
  "two", "use", "used", "using", "s", "t", "re", "ve",
]);

// --------------- Helpers ---------------------------------

/** Tokenise text into normalised, meaningful terms. */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Build a term-frequency map from a token list. */
function buildTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  // Normalise by document length.
  const len = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / len);
  }
  return tf;
}

/** Compute IDF weights given a collection of TF maps. */
function buildIDF(documents: Map<string, number>[]): Map<string, number> {
  const N = documents.length;
  const df = new Map<string, number>();
  for (const doc of documents) {
    for (const term of doc.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  }
  return idf;
}

/** Compute TF-IDF vector as a Map<term, tfidf_weight>. */
function tfidfVector(
  tf: Map<string, number>,
  idf: Map<string, number>
): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    vec.set(term, tfVal * (idf.get(term) ?? 1));
  }
  return vec;
}

/** Cosine similarity between two TF-IDF vectors. */
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [term, aVal] of a) {
    dot += aVal * (b.get(term) ?? 0);
    magA += aVal * aVal;
  }
  for (const bVal of b.values()) {
    magB += bVal * bVal;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// --------------- Public API ------------------------------

/**
 * Compute cosine similarity between two strings using TF-IDF term vectors.
 * Returns a value in [0, 1] — 1 means identical, 0 means no overlap.
 */
export function cosineSimilarity(a: string, b: string): number {
  const tokensA = tokenise(a);
  const tokensB = tokenise(b);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = buildTF(tokensA);
  const tfB = buildTF(tokensB);
  const idf = buildIDF([tfA, tfB]);
  const vecA = tfidfVector(tfA, idf);
  const vecB = tfidfVector(tfB, idf);

  return cosine(vecA, vecB);
}

/**
 * Check whether `candidate` is too similar to any of `existingTexts`.
 * Returns true if the max cosine similarity exceeds `threshold`.
 */
export function isTooSimilar(
  candidate: string,
  existingTexts: string[],
  threshold = 0.7
): boolean {
  if (existingTexts.length === 0) return false;
  const tokensC = tokenise(candidate);
  if (tokensC.length === 0) return false;

  const tfC = buildTF(tokensC);

  // Build IDF over candidate + all existing documents for consistent weighting.
  const allTFs = [
    tfC,
    ...existingTexts.map((t) => buildTF(tokenise(t))),
  ];
  const idf = buildIDF(allTFs);
  const vecC = tfidfVector(tfC, idf);

  for (const existing of existingTexts) {
    const tokensE = tokenise(existing);
    if (tokensE.length === 0) continue;
    const vecE = tfidfVector(buildTF(tokensE), idf);
    const sim = cosine(vecC, vecE);
    if (sim >= threshold) return true;
  }
  return false;
}

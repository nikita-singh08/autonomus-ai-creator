// ============================================================
// Critic — integrity gate stage
// ============================================================
// Runs deterministic quality checks on the drafted post before
// it is published.  Rejects the draft if ANY gate fails.
//
// Does NOT generate content or make topic decisions.
// ============================================================

import { isTooSimilar } from "@/lib/similarity";
import { logger } from "@/lib/logger";
import type { CriticResult, DraftResult, Post, PostSource } from "@/types/agent";

// --------------- Gate thresholds -------------------------

/** Minimum word count for a valid post. */
const MIN_WORDS = 60;

/** Maximum word count for a valid post. */
const MAX_WORDS = 350;

/** Cosine similarity threshold above which a post is "too similar" to recent posts. */
const SIMILARITY_THRESHOLD = 0.65;

/** Maximum allowed ratio of quoted text (characters inside " ") to total text. */
const MAX_QUOTE_RATIO = 0.4;

/** Minimum character length for the rationale field. */
const MIN_RATIONALE_CHARS = 40;

// --------------- Individual gate checks ------------------

interface GateResult {
  pass: boolean;
  reason: string;
  score: number; // contribution to overall quality score (0–100)
}

/** Gate 1: Minimum length check. */
function checkMinLength(text: string): GateResult {
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < MIN_WORDS) {
    return {
      pass: false,
      reason: `Post is too short: ${wordCount} words (minimum ${MIN_WORDS}).`,
      score: 0,
    };
  }
  return {
    pass: true,
    reason: `Length OK: ${wordCount} words.`,
    score: Math.min(20, Math.round((wordCount / MAX_WORDS) * 20)),
  };
}

/** Gate 2: Maximum length check. */
function checkMaxLength(text: string): GateResult {
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > MAX_WORDS) {
    return {
      pass: false,
      reason: `Post exceeds maximum length: ${wordCount} words (maximum ${MAX_WORDS}).`,
      score: 0,
    };
  }
  return {
    pass: true,
    reason: `Max length OK: ${wordCount} words.`,
    score: 20,
  };
}

/** Gate 3: Similarity check against recent posts. */
function checkSimilarity(text: string, recentPosts: Post[]): GateResult {
  if (recentPosts.length === 0) {
    return { pass: true, reason: "No recent posts to compare against.", score: 30 };
  }

  const recentTexts = recentPosts.map((p) => p.text);
  const tooSimilar = isTooSimilar(text, recentTexts, SIMILARITY_THRESHOLD);

  if (tooSimilar) {
    return {
      pass: false,
      reason: `Post is too similar to a recently published post (cosine similarity ≥ ${SIMILARITY_THRESHOLD}).`,
      score: 0,
    };
  }
  return { pass: true, reason: "Similarity check passed.", score: 30 };
}

/** Gate 4: Rationale presence and quality check. */
function checkRationale(rationale: string): GateResult {
  const trimmed = rationale.trim();
  if (trimmed.length < MIN_RATIONALE_CHARS) {
    return {
      pass: false,
      reason: `Rationale is empty or too short: ${trimmed.length} chars (minimum ${MIN_RATIONALE_CHARS}).`,
      score: 0,
    };
  }
  return {
    pass: true,
    reason: `Rationale OK: ${trimmed.length} chars.`,
    score: 20,
  };
}

/** Gate 5: Source presence check — at least one source required. */
function checkSources(sources: PostSource[]): GateResult {
  if (sources.length === 0) {
    return {
      pass: false,
      reason: "No sources provided. At least one source is required.",
      score: 0,
    };
  }

  // Validate that source URLs are non-empty strings.
  const invalidSources = sources.filter(
    (s) => !s.url || !s.url.startsWith("http")
  );
  if (invalidSources.length > 0) {
    return {
      pass: false,
      reason: `${invalidSources.length} source(s) have invalid or missing URLs.`,
      score: 0,
    };
  }

  return {
    pass: true,
    reason: `Sources OK: ${sources.length} source(s) with valid URLs.`,
    score: 10,
  };
}

/** Gate 6: Quotation ratio check — prevent mostly-quoted posts. */
function checkQuoteRatio(text: string): GateResult {
  const totalChars = text.length;
  if (totalChars === 0) return { pass: false, reason: "Empty post text.", score: 0 };

  // Count characters inside matching double-quotes.
  const quoted = (text.match(/"[^"]{10,}"/g) ?? []).join("");
  const ratio = quoted.length / totalChars;

  if (ratio > MAX_QUOTE_RATIO) {
    return {
      pass: false,
      reason: `Post is ${Math.round(ratio * 100)}% quoted text (maximum ${Math.round(MAX_QUOTE_RATIO * 100)}%). Write in your own voice.`,
      score: 0,
    };
  }
  return {
    pass: true,
    reason: `Quote ratio OK: ${Math.round(ratio * 100)}%.`,
    score: 0, // bonus not awarded — this is a disqualification gate only
  };
}

/** Gate 7: Low-quality text heuristic — catch placeholder or error outputs. */
function checkLowQuality(text: string): GateResult {
  const LOW_QUALITY_PATTERNS = [
    /^\s*\[/,                               // starts with "["
    /error|exception|undefined|null/i,     // error strings leaked into output
    /lorem ipsum/i,                         // placeholder text
    /TODO|FIXME|PLACEHOLDER/i,             // dev artifacts
    /as an ai language model/i,             // LLM refusal preamble
    /i cannot|i'm unable|i am unable/i,    // LLM refusal
  ];

  const lower = text.toLowerCase();
  for (const pattern of LOW_QUALITY_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        pass: false,
        reason: `Low-quality text detected: matches pattern ${pattern.source}.`,
        score: 0,
      };
    }
  }

  // Check for very low unique-word ratio (repetitive / degenerate output).
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const uniqueWords = new Set(words);
  const uniqueRatio = words.length > 0 ? uniqueWords.size / words.length : 0;
  if (uniqueRatio < 0.35 && words.length > 30) {
    return {
      pass: false,
      reason: `Text appears repetitive: only ${Math.round(uniqueRatio * 100)}% unique words.`,
      score: 0,
    };
  }

  return { pass: true, reason: "Quality check passed.", score: 0 };
}

// --------------- Public API ------------------------------

/**
 * Evaluate a drafted post against all integrity gates.
 *
 * Gates (all must pass for publication):
 *   1. Minimum length  (≥ MIN_WORDS words)
 *   2. Maximum length  (≤ MAX_WORDS words)
 *   3. Similarity      (cosine < SIMILARITY_THRESHOLD vs. recent posts)
 *   4. Rationale       (non-empty, ≥ MIN_RATIONALE_CHARS)
 *   5. Sources         (at least one valid source URL)
 *   6. Quote ratio     (< MAX_QUOTE_RATIO)
 *   7. Low-quality     (no error text, no LLM refusals, not repetitive)
 *
 * @param draft       - The writer's output: { text, rationale }
 * @param recentPosts - Past posts to check similarity against
 * @param sources     - Sources to validate
 * @returns           { pass, reason, score }
 */
export async function evaluate(
  draft: DraftResult,
  recentPosts: Post[],
  sources: PostSource[]
): Promise<CriticResult> {
  logger.info("critic: Critic Started", {
    textWordCount: draft.text.split(/\s+/).length,
    sourceCount: sources.length,
    recentPostCount: recentPosts.length,
  });

  // Run all gates in order — fail-fast on first failure.
  const gates: GateResult[] = [
    checkMinLength(draft.text),
    checkMaxLength(draft.text),
    checkRationale(draft.rationale),
    checkSources(sources),
    checkQuoteRatio(draft.text),
    checkLowQuality(draft.text),
    checkSimilarity(draft.text, recentPosts), // most expensive — run last
  ];

  let totalScore = 0;
  const reasons: string[] = [];

  for (const gate of gates) {
    totalScore += gate.score;
    reasons.push(gate.reason);

    if (!gate.pass) {
      logger.info("critic: Critic Decision — REJECTED", {
        reason: gate.reason,
        score: totalScore,
      });
      return { pass: false, reason: gate.reason, score: totalScore };
    }
  }

  // All gates passed.
  const finalScore = Math.min(100, totalScore);
  const summary = `All gates passed. Score: ${finalScore}/100. ${reasons.join(" | ")}`;

  logger.info("critic: Critic Decision — ACCEPTED", {
    score: finalScore,
    summary,
  });

  return { pass: true, reason: summary, score: finalScore };
}

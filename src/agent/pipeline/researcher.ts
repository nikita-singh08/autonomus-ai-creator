// ============================================================
// Researcher — fact extraction + source binding stage
// ============================================================
// Fetches the full article text for the chosen topic, extracts
// facts and key points, and binds every fact to its source URL.
//
// Does NOT judge quality, score, or write the post.
// ============================================================

import { logger } from "@/lib/logger";
import type { BoundFact, CandidateTopic, PostSource, ResearchResult } from "@/types/agent";

// --------------- Constants --------------------------------

/** Max chars fetched from article body before truncation (prevents huge payloads). */
const MAX_BODY_CHARS = 8_000;

/** HTTP timeout for article fetches (ms). */
const FETCH_TIMEOUT_MS = 15_000;

/** Minimum number of fact sentences to extract. */
const MIN_FACTS = 3;

// --------------- HTML → plain text -----------------------

/**
 * Extremely lightweight HTML → plain text conversion.
 * Avoids a full DOM parser dependency.
 * 1. Removes <script> and <style> blocks entirely.
 * 2. Strips all remaining HTML tags.
 * 3. Collapses whitespace.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// --------------- Fact extraction --------------------------

/**
 * Extract the main textual body from an HTML page.
 * Prefers <article>, <main>, or <body> content, in that order.
 */
function extractMainBody(html: string): string {
  // Try <article> first.
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) return htmlToText(articleMatch[0]);

  // Try <main>.
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  if (mainMatch) return htmlToText(mainMatch[0]);

  // Fall back to stripping the whole page.
  return htmlToText(html);
}

/**
 * Split plain text into individual sentences.
 * Uses period/question mark/exclamation mark as delimiters.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end-of-string.
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30); // discard very short fragments
}

/**
 * Heuristically extract the most informative sentences as facts.
 *
 * Scoring heuristics (deterministic — no LLM):
 *  - Prefer sentences containing numbers (data points, percentages, years).
 *  - Prefer sentences containing quoted content.
 *  - Prefer sentences of moderate length (50–200 chars).
 *  - Avoid sentences that look like nav/header/footer noise.
 *
 * Returns an array of BoundFact, each bound to `sourceUrl`.
 */
function extractFacts(text: string, sourceUrl: string): BoundFact[] {
  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) return [];

  const NOISE_PATTERNS = [
    /^(home|menu|search|skip|log ?in|sign ?up|subscribe|cookie|privacy|terms)/i,
    /^(copyright|©|\d{4}\s+all rights)/i,
    /^(read more|click here|see also|related)/i,
  ];

  const isNoise = (s: string) => NOISE_PATTERNS.some((p) => p.test(s));

  const scored = sentences
    .filter((s) => !isNoise(s))
    .map((s) => {
      let score = 0;
      // Numeric data (statistics, years, percentages).
      if (/\d/.test(s)) score += 3;
      // Quoted material (key claims).
      if (/["']/.test(s)) score += 2;
      // Moderate length sweet-spot.
      if (s.length >= 60 && s.length <= 250) score += 2;
      // Very long sentences are often run-ons.
      if (s.length > 400) score -= 1;
      // Contains proper-noun indicators (capitalised words mid-sentence).
      const caps = (s.match(/\b[A-Z][a-z]{2,}/g) ?? []).length;
      if (caps >= 2) score += 1;
      return { sentence: s, score };
    })
    .sort((a, b) => b.score - a.score);

  // Take top facts but ensure at least MIN_FACTS if possible.
  const topCount = Math.max(MIN_FACTS, Math.min(10, Math.ceil(scored.length * 0.2)));
  const top = scored.slice(0, topCount);

  return top.map(({ sentence }) => ({
    fact: sentence,
    sourceUrl,
  }));
}

/**
 * Generate a short summary (2–3 sentences) from the extracted facts.
 * Deterministic: picks the top-3 highest-scored sentences and joins them.
 */
function generateSummary(facts: BoundFact[]): string {
  if (facts.length === 0) return "No content could be extracted from this article.";
  return facts
    .slice(0, 3)
    .map((f) => f.fact)
    .join(" ");
}

// --------------- Article fetcher --------------------------

/**
 * Fetch the raw HTML of a URL with a timeout.
 * Returns null on any network failure.
 */
async function fetchArticleHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "AutonomousAICreator/1.0 (+https://github.com/autonomus-ai-creator)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!response.ok) {
      logger.warn("researcher: non-2xx response fetching article", {
        url,
        status: response.status,
      });
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      logger.warn("researcher: unexpected content-type", { url, contentType });
      return null;
    }

    const text = await response.text();
    return text.slice(0, MAX_BODY_CHARS * 10); // pre-limit before parsing
  } catch (err) {
    logger.warn("researcher: failed to fetch article", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// --------------- Public API --------------------------------

/**
 * Gather facts and source bindings for the curator-selected topic.
 *
 * Steps:
 *   1. Fetch full HTML of topic.url
 *   2. Extract main body text (prefer <article>/<main>)
 *   3. Split into sentences and score for informativeness
 *   4. Return top facts bound to topic.url
 *   5. If fetch fails, construct a minimal result from snippet/title
 *
 * @param topic - The curator-selected topic to research
 * @returns     { facts[], sources[], summary } — facts bound to source URLs
 */
export async function gather(
  topic: CandidateTopic & { publishedAt?: Date; source?: string }
): Promise<ResearchResult & { summary: string; keyPoints: string[] }> {
  logger.info("researcher: Research Started", {
    url: topic.url,
    title: topic.title,
    source: topic.source,
  });

  const fetchedAt = new Date();
  let facts: BoundFact[] = [];
  let fetchSucceeded = false;

  // ── Step 1 & 2: fetch + extract ───────────────────────────
  const html = await fetchArticleHtml(topic.url);

  if (html) {
    const bodyText = extractMainBody(html).slice(0, MAX_BODY_CHARS);

    if (bodyText.length > 100) {
      facts = extractFacts(bodyText, topic.url);
      fetchSucceeded = true;
    } else {
      logger.warn("researcher: body text too short after extraction", {
        url: topic.url,
        bodyLength: bodyText.length,
      });
    }
  }

  // ── Fallback: use snippet + title if fetch failed ─────────
  if (!fetchSucceeded || facts.length === 0) {
    logger.warn("researcher: falling back to snippet/title for facts", {
      url: topic.url,
    });

    const fallbackText = [topic.title, topic.snippet ?? ""]
      .filter(Boolean)
      .join(". ");

    if (fallbackText.length > 10) {
      facts = extractFacts(fallbackText, topic.url);
    }

    // Absolute minimum: at least one fact from the title.
    if (facts.length === 0) {
      facts = [{ fact: topic.title, sourceUrl: topic.url }];
    }
  }

  // ── Build PostSource record ────────────────────────────────
  const postSource: PostSource = {
    url: topic.url,
    fetchedAt,
    factsExtracted: facts.map((f) => f.fact),
  };

  // ── Summary + key points ──────────────────────────────────
  const summary = generateSummary(facts);
  const keyPoints = facts.slice(0, 5).map((f) => f.fact);

  logger.info("researcher: Research Finished", {
    url: topic.url,
    factCount: facts.length,
    fetchSucceeded,
    summary: summary.slice(0, 120) + "…",
  });

  return {
    facts,
    sources: [postSource],
    summary,
    keyPoints,
  };
}

// ============================================================
// Curator — editorial judgment / scoring stage
// ============================================================
// Scores every candidate topic deterministically across five
// criteria, selects the highest-scoring topic (or deliberately
// decides NOT to publish if no topic meets the quality bar),
// and persists the decisions to the database.
//
// Does NOT fetch content, write posts, or publish anything.
// ============================================================

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { CandidateTopic, CuratorResult, Persona, Post } from "@/types/agent";

// --------------- Scoring constants -----------------------

/** Minimum total score (0–100) a topic must reach to be accepted. */
const ACCEPT_THRESHOLD = 30;

/**
 * Source tier weights — keyed by the label suffix patterns we know.
 * Tier 1 = authoritative primary sources, Tier 2 = reputable media,
 * Tier 3 = community aggregators.
 */
const TIER_1_LABELS = [
  "openai",
  "anthropic",
  "google ai",
  "microsoft ai",
  "huggingface",
  "github",
  "mit technology review",
  "meta engineering",
  "netflix tech blog",
  "aws blog",
];

const TIER_2_LABELS = [
  "venturebeat",
  "techcrunch",
  "ars technica",
  "wired",
  "arxiv",
  "pragmatic engineer",
  "opensource.com",
];

// --------------- Scoring helpers -------------------------

/**
 * Novelty score (0–30).
 * Penalises topics whose titles overlap heavily with recent post text.
 * Uses simple token-overlap (Jaccard coefficient) — no LLM required.
 */
function scoreNovelty(
  candidate: CandidateTopic,
  recentPosts: Post[]
): { score: number; reason: string } {
  if (recentPosts.length === 0) return { score: 30, reason: "no recent posts; full novelty" };

  const candidateTokens = tokenise(candidate.title);

  let maxOverlap = 0;
  for (const post of recentPosts) {
    const postTokens = new Set(tokenise(post.text + " " + post.rationale));
    const intersection = candidateTokens.filter((t) => postTokens.has(t));
    const union = new Set([...candidateTokens, ...postTokens]);
    const jaccard = union.size === 0 ? 0 : intersection.length / union.size;
    if (jaccard > maxOverlap) maxOverlap = jaccard;
  }

  // maxOverlap in [0, 1]: 0 → fully novel, 1 → exact duplicate
  const score = Math.round(30 * (1 - maxOverlap));
  const reason =
    maxOverlap > 0.4
      ? `high overlap (${(maxOverlap * 100).toFixed(0)}%) with recent posts`
      : `low overlap (${(maxOverlap * 100).toFixed(0)}%) — novel topic`;
  return { score, reason };
}

/**
 * Timeliness score (0–25).
 * Newer articles score higher; articles with no date get a neutral score.
 */
function scoreTimeliness(
  candidate: CandidateTopic & { publishedAt?: Date }
): { score: number; reason: string } {
  const pub = candidate.publishedAt;
  if (!pub) return { score: 12, reason: "no publish date — neutral timeliness" };

  const ageHours = (Date.now() - pub.getTime()) / (1000 * 60 * 60);

  if (ageHours <= 6)  return { score: 25, reason: `very fresh (${ageHours.toFixed(0)}h old)` };
  if (ageHours <= 24) return { score: 20, reason: `fresh (${ageHours.toFixed(0)}h old)` };
  if (ageHours <= 48) return { score: 12, reason: `moderate age (${ageHours.toFixed(0)}h old)` };
  if (ageHours <= 72) return { score: 5,  reason: `older article (${ageHours.toFixed(0)}h old)` };
  return { score: 0, reason: `stale article (${ageHours.toFixed(0)}h old)` };
}

/**
 * Persona relevance score (0–25).
 * Counts how many of the persona's pillar keywords appear in the
 * candidate title + snippet.
 */
function scorePersonaRelevance(
  candidate: CandidateTopic,
  persona: Persona
): { score: number; reason: string } {
  const haystack = `${candidate.title} ${candidate.snippet ?? ""}`.toLowerCase();
  const hits = persona.pillars.filter((p) => haystack.includes(p.toLowerCase()));

  const score = Math.min(25, hits.length * 8 + (hits.length > 0 ? 5 : 0));
  const reason =
    hits.length > 0
      ? `matches pillars: ${hits.join(", ")}`
      : "no pillar keywords found in title/snippet";
  return { score, reason };
}

/**
 * Source quality score (0–15).
 * Tier-1 sources get full marks; tier-2 partial; unknown sources get minimum.
 */
function scoreSourceQuality(
  candidate: CandidateTopic & { source?: string }
): { score: number; reason: string } {
  const src = (candidate.source ?? "").toLowerCase();

  if (TIER_1_LABELS.some((l) => src.includes(l))) {
    return { score: 15, reason: `tier-1 source: "${candidate.source}"` };
  }
  if (TIER_2_LABELS.some((l) => src.includes(l))) {
    return { score: 10, reason: `tier-2 source: "${candidate.source}"` };
  }
  if (src) {
    return { score: 5, reason: `tier-3 / unknown source: "${candidate.source}"` };
  }
  return { score: 3, reason: "no source label — minimum quality score" };
}

/**
 * Duplicate penalty (0 to −20).
 * If the same URL was already chosen or published in the last 7 days, reject immediately.
 */
async function scoreDuplicatePenalty(
  candidate: CandidateTopic,
  agentId: string
): Promise<{ penalty: number; reason: string }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Check if this URL was already chosen (became a post topic).
  const existing = await prisma.topic.findFirst({
    where: {
      agentId,
      url: candidate.url,
      status: { in: ["chosen"] },
      discoveredAt: { gte: sevenDaysAgo },
    },
  });

  if (existing) {
    return { penalty: -20, reason: "URL already chosen within 7 days" };
  }

  return { penalty: 0, reason: "no duplicate penalty" };
}

// --------------- Tokeniser --------------------------------

/** Simple word tokeniser; filters stop-words and short tokens. */
function tokenise(text: string): string[] {
  const STOP_WORDS = new Set([
    "the", "a", "an", "in", "on", "at", "to", "for", "of", "and",
    "or", "is", "it", "its", "with", "that", "this", "are", "was",
    "be", "by", "from", "as", "has", "have", "will", "can",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

// --------------- Scored topic type -----------------------

interface ScoredTopic {
  candidate: CandidateTopic & { publishedAt?: Date; source?: string };
  totalScore: number;
  breakdown: {
    novelty: number;
    timeliness: number;
    personaRelevance: number;
    sourceQuality: number;
    duplicatePenalty: number;
  };
  reasons: string[];
  decision: "accepted" | "rejected";
  rejectReason?: string;
}

// --------------- Public API ------------------------------

/**
 * Score every candidate topic and select the best one.
 *
 * Scoring breakdown (max 100 − 20 penalty = effective max 80):
 *   • Novelty            0–30
 *   • Timeliness         0–25
 *   • Persona relevance  0–25
 *   • Source quality     0–15
 *   • Duplicate penalty  0 to −20
 *
 * Topics scoring below ACCEPT_THRESHOLD are rejected.
 * If ALL topics are rejected, chosenTopic is null — system intentionally
 * decides NOT to publish for this cycle.
 *
 * @param candidates  - Topics discovered by the scout
 * @param recentPosts - Recent posts for novelty / dedupe scoring
 * @param persona     - Current persona for relevance scoring
 * @param agentId     - Agent ID for DB lookups (duplicate penalty)
 * @returns           { chosenTopic, reasoning } — chosenTopic is null if skipping
 */
export async function judge(
  candidates: CandidateTopic[],
  recentPosts: Post[],
  persona: Persona,
  agentId: string
): Promise<CuratorResult> {
  logger.info("curator: Curator Started", {
    agentId,
    candidateCount: candidates.length,
  });

  if (candidates.length === 0) {
    const reasoning = "No candidates available — skipping this cycle.";
    logger.info("curator: Curator Decision", {
      agentId,
      decision: "rejected",
      reason: reasoning,
    });
    return { chosenTopic: null, reasoning };
  }

  // ── Score every candidate ─────────────────────────────────
  const scored: ScoredTopic[] = [];

  for (const raw of candidates) {
    const candidate = raw as CandidateTopic & { publishedAt?: Date; source?: string };

    const noveltyResult       = scoreNovelty(candidate, recentPosts);
    const timelinessResult    = scoreTimeliness(candidate);
    const relevanceResult     = scorePersonaRelevance(candidate, persona);
    const qualityResult       = scoreSourceQuality(candidate);
    const penaltyResult       = await scoreDuplicatePenalty(candidate, agentId);

    const totalScore =
      noveltyResult.score +
      timelinessResult.score +
      relevanceResult.score +
      qualityResult.score +
      penaltyResult.penalty;

    const reasons = [
      `novelty: ${noveltyResult.score}/30 — ${noveltyResult.reason}`,
      `timeliness: ${timelinessResult.score}/25 — ${timelinessResult.reason}`,
      `persona relevance: ${relevanceResult.score}/25 — ${relevanceResult.reason}`,
      `source quality: ${qualityResult.score}/15 — ${qualityResult.reason}`,
      `duplicate penalty: ${penaltyResult.penalty} — ${penaltyResult.reason}`,
    ];

    const decision: "accepted" | "rejected" =
      totalScore >= ACCEPT_THRESHOLD ? "accepted" : "rejected";

    const entry: ScoredTopic = {
      candidate,
      totalScore,
      breakdown: {
        novelty: noveltyResult.score,
        timeliness: timelinessResult.score,
        personaRelevance: relevanceResult.score,
        sourceQuality: qualityResult.score,
        duplicatePenalty: penaltyResult.penalty,
      },
      reasons,
      decision,
      rejectReason:
        decision === "rejected"
          ? `Score ${totalScore} below threshold ${ACCEPT_THRESHOLD}. ${reasons.join(" | ")}`
          : undefined,
    };

    scored.push(entry);

    logger.info("curator: Curator Decision", {
      agentId,
      title: candidate.title,
      score: totalScore,
      decision,
      breakdown: entry.breakdown,
    });
  }

  // ── Sort accepted topics by score (highest first) ─────────
  const accepted = scored
    .filter((s) => s.decision === "accepted")
    .sort((a, b) => b.totalScore - a.totalScore);

  const rejected = scored.filter((s) => s.decision === "rejected");

  // ── Persist all decisions to DB ───────────────────────────
  for (const item of scored) {
    try {
      // Find the DB topic row for this candidate (must already exist from scout).
      const row = await prisma.topic.findFirst({
        where: { url: item.candidate.url, agentId },
      });
      if (!row) continue;

      await prisma.topic.update({
        where: { id: row.id },
        data: {
          status: item.decision === "accepted" ? "candidate" : "rejected",
          rejectReason: item.rejectReason ?? null,
        },
      });
    } catch (err) {
      logger.warn("curator: failed to persist topic decision", {
        url: item.candidate.url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Handle "skip this cycle" ──────────────────────────────
  if (accepted.length === 0) {
    const reasonSummary = `All ${candidates.length} candidate(s) scored below threshold (${ACCEPT_THRESHOLD}). System intentionally chose NOT TO PUBLISH this cycle. Rejected: ${rejected.map((r) => `"${r.candidate.title}" [${r.totalScore}]`).join(", ")}`;

    logger.info("curator: Curator Decision — no publication", {
      agentId,
      decision: "held",
      reason: reasonSummary,
    });

    return { chosenTopic: null, reasoning: reasonSummary };
  }

  // ── Select the winner ─────────────────────────────────────
  const winner = accepted[0];

  // Mark winner as "chosen" in the DB.
  try {
    const row = await prisma.topic.findFirst({
      where: { url: winner.candidate.url, agentId },
    });
    if (row) {
      await prisma.topic.update({
        where: { id: row.id },
        data: { status: "chosen", rejectReason: null },
      });
    }
  } catch (err) {
    logger.warn("curator: failed to mark topic as chosen", {
      url: winner.candidate.url,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const reasoning = [
    `Accepted topic: "${winner.candidate.title}" [score: ${winner.totalScore}].`,
    ...winner.reasons,
    `Rejected ${rejected.length} other candidate(s).`,
  ].join(" | ");

  logger.info("curator: Curator Decision — accepted", {
    agentId,
    chosenTitle: winner.candidate.title,
    score: winner.totalScore,
  });

  return {
    chosenTopic: winner.candidate,
    reasoning,
  };
}

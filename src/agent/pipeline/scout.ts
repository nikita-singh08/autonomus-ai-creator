// ============================================================
// Scout — topic discovery stage
// ============================================================
// Fetches RSS sources from src/config/sources.ts aligned with
// the persona's pillars.  Normalises every article into a
// CandidateTopic and deduplicates against the database before
// returning.  Never inserts duplicate URLs.
//
// Does NOT score, judge, or rank topics.
// ============================================================

import { logger } from "@/lib/logger";
import { fetchFeeds } from "@/lib/rss";
import { prisma } from "@/lib/prisma";
import sources from "@/config/sources";
import type { CandidateTopic, Persona } from "@/types/agent";
import type { RssSource } from "@/config/sources";

// --------------- Constants --------------------------------

/** Maximum candidates returned per scout run. Prevents DB bloat. */
const MAX_CANDIDATES = 50;

/** Feeds older than this are considered stale and filtered out. */
const MAX_AGE_HOURS = 72;

/** Keywords that disqualify an article immediately (e.g., consumer junk). */
const REJECT_KEYWORDS = [
  "coupon",
  "deal",
  "promo code",
  "buying guide",
  "tv show",
  "streaming",
  "entertainment",
  "shopping",
];

/** Keywords that strongly signal AI/Tech relevance. */
const ACCEPT_KEYWORDS = [
  "artificial intelligence",
  "llm",
  "robotics",
  "machine learning",
  "open source",
  "programming",
  "software engineering",
  "cloud",
  "security",
  "ai product",
  "developer tool",
  "research",
];

// --------------- Helpers ----------------------------------

/**
 * Resolve the set of RSS sources to fetch based on the persona's pillars.
 * A pillar matches a domain key via case-insensitive substring or keyword check.
 */
function resolveFeeds(persona: Persona): Array<{ url: string; label: string }> {
  const pillarKeywords = persona.pillars.map((p) => p.toLowerCase());

  // Map each pillar keyword → matching domain keys in sources config.
  // E.g. "artificial intelligence" → "ai", "software engineering" → "technology".
  const PILLAR_DOMAIN_MAP: Record<string, string[]> = {
    "artificial intelligence": ["ai"],
    "machine learning": ["ai"],
    "software engineering": ["technology"],
    "developer tools": ["technology", "opensource"],
    "open source": ["opensource"],
    "systems design": ["systems", "technology"],
  };

  const domainsToFetch = new Set<string>();

  for (const pillar of pillarKeywords) {
    // Exact or substring match against source domain keys.
    for (const domain of Object.keys(sources)) {
      if (
        domain.includes(pillar) ||
        pillar.includes(domain) ||
        (PILLAR_DOMAIN_MAP[pillar] ?? []).includes(domain)
      ) {
        domainsToFetch.add(domain);
      }
    }
  }

  // If no pillar matched anything, fall back to all sources.
  if (domainsToFetch.size === 0) {
    for (const domain of Object.keys(sources)) {
      domainsToFetch.add(domain);
    }
  }

  const feeds: Array<{ url: string; label: string }> = [];
  for (const domain of domainsToFetch) {
    const domainSources: RssSource[] = sources[domain] ?? [];
    for (const src of domainSources) {
      feeds.push({ url: src.url, label: src.label });
    }
  }

  return feeds;
}

/**
 * Return true if the item's title or URL contains any anti-topic keyword.
 */
function isAntiTopic(
  title: string,
  url: string,
  antiTopics: string[]
): boolean {
  const combined = `${title} ${url}`.toLowerCase();
  return antiTopics.some((anti) => combined.includes(anti.toLowerCase()));
}

/**
 * Return true if the article is within the acceptable age window.
 */
function isRecent(publishedAt?: Date): boolean {
  if (!publishedAt) return true; // no date → assume recent
  const ageMs = Date.now() - publishedAt.getTime();
  return ageMs <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

/**
 * Return true if the item's title or snippet contains any AI/Tech accept keyword,
 * and contains NO reject keywords like coupons or deals.
 */
function isRelevantTopic(title: string, snippet?: string): boolean {
  const combined = `${title} ${snippet ?? ""}`.toLowerCase();
  
  if (REJECT_KEYWORDS.some((kw) => combined.includes(kw))) {
    return false;
  }
  
  if (ACCEPT_KEYWORDS.some((kw) => combined.includes(kw))) {
    return true;
  }
  
  return false;
}

// --------------- Public API --------------------------------

/**
 * Discover candidate topics aligned with the persona's pillars.
 *
 * Steps:
 *   1. Resolve feed URLs from sources.ts matching persona.pillars
 *   2. Fetch all feeds via lib/rss.fetchFeeds() (parallel, fault-tolerant)
 *   3. Filter stale items (older than MAX_AGE_HOURS)
 *   4. Filter items matching persona.antiTopics
 *   5. Deduplicate against DB (Topics table + in-memory seenUrls)
 *   6. Persist new candidates to the DB as status="candidate"
 *   7. Return the cleaned candidate list (capped at MAX_CANDIDATES)
 *
 * @param persona  - Current persona config (pillars, antiTopics, domain)
 * @param agentId  - Agent ID used for DB deduplication lookups
 * @returns        Array of candidate topics to pass to the curator
 */
export async function discover(
  persona: Persona,
  agentId: string
): Promise<CandidateTopic[]> {
  logger.info("scout: Scout Started", { agentId, domain: persona.domain });

  // ── Step 1: resolve feeds ─────────────────────────────────
  const feeds = resolveFeeds(persona);

  if (feeds.length === 0) {
    logger.warn("scout: no feeds resolved for persona pillars", {
      pillars: persona.pillars,
    });
    logger.info("scout: Scout Finished", { agentId, candidateCount: 0 });
    return [];
  }

  logger.info("scout: fetching feeds", {
    agentId,
    feedCount: feeds.length,
    feeds: feeds.map((f) => f.label),
  });

  // ── Step 2: fetch all feeds ────────────────────────────────
  const rawItems = await fetchFeeds(feeds);

  if (rawItems.length === 0) {
    logger.warn("scout: all feeds returned empty — network issue or empty feeds", {
      agentId,
    });
    logger.info("scout: Scout Finished", { agentId, candidateCount: 0 });
    return [];
  }

  // ── Step 3 & 4: filter by age, anti-topics, and relevance ─────────────
  const filtered = rawItems.filter((item) => {
    if (!isRecent(item.publishedAt)) return false;
    if (isAntiTopic(item.title, item.url, persona.antiTopics)) return false;
    if (!isRelevantTopic(item.title, item.snippet)) return false;
    return true;
  });

  // ── Step 5: deduplicate against DB ────────────────────────
  // Load URLs we've seen in the past 48 h for this agent.
  const windowMs = 48 * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);
  const existingRows = await prisma.topic.findMany({
    where: { agentId, discoveredAt: { gte: since } },
    select: { url: true },
  });
  const seenUrls = new Set(existingRows.map((r) => r.url));

  // Deduplicate within the current batch too.
  const inBatchSeen = new Set<string>();
  const deduped = filtered.filter((item) => {
    if (seenUrls.has(item.url)) return false;
    if (inBatchSeen.has(item.url)) return false;
    inBatchSeen.add(item.url);
    return true;
  });

  if (deduped.length === 0) {
    logger.info("scout: no new candidates after deduplication", { agentId });
    logger.info("scout: Scout Finished", { agentId, candidateCount: 0 });
    return [];
  }

  // ── Step 6: persist candidates to DB ──────────────────────
  const capped = deduped.slice(0, MAX_CANDIDATES);

  // Use createMany where possible; fall back to individual creates
  // to handle any remaining race-condition duplicates gracefully.
  const saved: CandidateTopic[] = [];

  for (const item of capped) {
    try {
      await prisma.topic.create({
        data: {
          agentId,
          title: item.title,
          url: item.url,
          status: "candidate",
        },
      });
      saved.push({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        source: item.source,
        publishedAt: item.publishedAt,
      } as CandidateTopic & { publishedAt?: Date; source?: string });
    } catch (err) {
      // Unique constraint violation or other DB error — skip silently.
      logger.warn("scout: failed to persist candidate topic", {
        url: item.url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info("scout: Scout Finished", {
    agentId,
    candidateCount: saved.length,
    rawFetched: rawItems.length,
    afterFilter: filtered.length,
    afterDedupe: deduped.length,
  });

  return saved;
}

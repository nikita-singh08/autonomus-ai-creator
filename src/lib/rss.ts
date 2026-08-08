// ============================================================
// RSS feed fetching utility
// ============================================================
// Uses `rss-parser` for robust RSS 2.0 / Atom parsing.
// Handles redirects, malformed feeds, and network timeouts.
// Returns a normalised FeedItem[] regardless of feed format.
// ============================================================

import Parser from "rss-parser";
import { logger } from "@/lib/logger";

// --------------- Types -----------------------------------

export interface FeedItem {
  title: string;
  url: string;
  publishedAt?: Date;
  /** Short textual excerpt (first ~300 chars of content or description) */
  snippet?: string;
  /** Human-readable source label, e.g. "OpenAI Blog" */
  source?: string;
}

// --------------- Internal parser -------------------------

// rss-parser instance — shared, stateless, safe to reuse.
const parser = new Parser({
  timeout: 10_000, // 10 s hard timeout per feed
  headers: {
    "User-Agent": "AutonomousAICreator/1.0 (+https://github.com/autonomus-ai-creator)",
    Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:description", "mediaDescription"],
      ["summary", "summary"],
      ["description", "description"],
    ],
  },
});

// --------------- Helpers ---------------------------------

/**
 * Extract a short snippet from whatever content/description fields exist.
 * Strips HTML tags and trims to 300 chars.
 */
function extractSnippet(item: Parser.Item): string | undefined {
  const raw =
    (item as unknown as { mediaDescription?: string }).mediaDescription ||
    item.contentSnippet ||
    item.summary ||
    item.content ||
    "";

  if (!raw) return undefined;

  // Strip HTML tags (rss-parser may leave some in `content`)
  const stripped = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.slice(0, 300) || undefined;
}

/**
 * Parse a raw date string tolerantly; return undefined on failure.
 */
function parseDate(raw?: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Normalise a single rss-parser item into our FeedItem shape.
 */
function normalise(item: Parser.Item, sourceLabel?: string): FeedItem | null {
  const url = item.link ?? item.guid;
  const title = item.title?.trim();

  // Both url and title are required — skip malformed items silently.
  if (!url || !title) return null;

  return {
    title,
    url,
    publishedAt: parseDate(item.pubDate ?? item.isoDate),
    snippet: extractSnippet(item),
    source: sourceLabel,
  };
}

// --------------- Public API ------------------------------

/**
 * Fetch and parse a single RSS/Atom feed URL.
 * Returns an empty array on any network or parse failure (with a warning log).
 *
 * @param feedUrl     - URL of the RSS/Atom feed
 * @param sourceLabel - Optional label to attach to every item (e.g. "OpenAI Blog")
 */
export async function fetchFeed(
  feedUrl: string,
  sourceLabel?: string
): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items: FeedItem[] = [];

    for (const item of feed.items ?? []) {
      const normalised = normalise(item, sourceLabel ?? feed.title ?? undefined);
      if (normalised) items.push(normalised);
    }

    logger.debug("rss.fetchFeed: parsed feed", {
      feedUrl,
      itemCount: items.length,
    });

    return items;
  } catch (err) {
    // Network failures, malformed XML, CORS, timeouts — never throw; just warn.
    logger.warn("rss.fetchFeed: failed to fetch or parse feed", {
      feedUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Fetch multiple RSS/Atom feeds in parallel and merge results.
 * Individual feed failures are logged and skipped — they do NOT abort the batch.
 *
 * @param feeds - Array of { url, label? } objects
 */
export async function fetchFeeds(
  feeds: Array<{ url: string; label?: string }>
): Promise<FeedItem[]> {
  if (feeds.length === 0) return [];

  const results = await Promise.allSettled(
    feeds.map(({ url, label }) => fetchFeed(url, label))
  );

  const all: FeedItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      all.push(...result.value);
    }
    // Rejections already logged inside fetchFeed — nothing more to do here.
  }

  logger.debug("rss.fetchFeeds: merged feeds", {
    feedCount: feeds.length,
    totalItems: all.length,
  });

  return all;
}

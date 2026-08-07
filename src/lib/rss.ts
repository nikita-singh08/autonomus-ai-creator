// ============================================================
// RSS feed fetching utility
// ============================================================
// TODO (Milestone 3 – Scout): Implement real RSS fetching & parsing.
// - Use a library such as `rss-parser` or `fast-xml-parser`
// - Handle redirects, malformed feeds, and network timeouts
// - Return a normalised FeedItem[] regardless of feed format (RSS 2.0, Atom)

export interface FeedItem {
  title: string;
  url: string;
  publishedAt?: Date;
  snippet?: string;
  source?: string;
}

/**
 * Fetch and parse an RSS/Atom feed URL.
 *
 * TODO: implement actual HTTP fetch + XML parse.
 */
export async function fetchFeed(feedUrl: string): Promise<FeedItem[]> {
  // TODO (Milestone 3): Replace stub with real implementation.
  void feedUrl;
  throw new Error("RSS fetching not yet implemented — see TODO in src/lib/rss.ts");
}

/**
 * Fetch multiple feeds and merge results, preserving source metadata.
 *
 * TODO: implement parallel fetching with Promise.allSettled.
 */
export async function fetchFeeds(feedUrls: string[]): Promise<FeedItem[]> {
  // TODO (Milestone 3): Replace stub with real parallel implementation.
  void feedUrls;
  throw new Error("RSS fetching not yet implemented — see TODO in src/lib/rss.ts");
}

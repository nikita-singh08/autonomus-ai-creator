// ============================================================
// RSS / feed source URLs, keyed by domain / pillar
// ============================================================
// TODO (Milestone 3 – Scout): Add real RSS feed URLs for each domain pillar.
// Each key maps to the persona's pillar topics; values are arrays of feed URLs
// that the scout will fetch and deduplicate.

export type DomainSources = Record<string, string[]>;

const sources: DomainSources = {
  // TODO: replace with real RSS URLs per domain/pillar
  technology: [
    // "https://feeds.arstechnica.com/arstechnica/technology-lab",
    // "https://www.wired.com/feed/rss",
  ],
  ai: [
    // "https://venturebeat.com/category/ai/feed/",
    // "https://techcrunch.com/category/artificial-intelligence/feed/",
  ],
  science: [
    // "https://www.sciencedaily.com/rss/top/science.xml",
  ],
};

export default sources;

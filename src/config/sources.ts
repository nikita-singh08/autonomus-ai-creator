// ============================================================
// RSS / feed source URLs, keyed by domain / pillar
// ============================================================
// Each key maps roughly to the persona's pillar topics.
// Values are arrays of RSS/Atom feed URLs the scout will fetch
// and deduplicate each cycle.
//
// Sources span: OpenAI, Anthropic, Google AI, Microsoft AI,
// HuggingFace, GitHub Blog, Arxiv AI, Hacker News, MIT Tech Review.
// ============================================================

export interface RssSource {
  url: string;
  /** Human-readable label used as the `source` field on FeedItem */
  label: string;
  /** Quality tier: 1 = tier-1 authoritative, 2 = reputable, 3 = community */
  tier: 1 | 2 | 3;
}

export type DomainSources = Record<string, RssSource[]>;

const sources: DomainSources = {
  // ── Artificial Intelligence ──────────────────────────────
  ai: [
    {
      url: "https://openai.com/news/rss.xml",
      label: "OpenAI Blog",
      tier: 1,
    },
    {
      url: "https://www.anthropic.com/rss.xml",
      label: "Anthropic Blog",
      tier: 1,
    },
    {
      url: "https://blog.google/technology/ai/rss/",
      label: "Google AI Blog",
      tier: 1,
    },
    {
      url: "https://blogs.microsoft.com/ai/feed/",
      label: "Microsoft AI Blog",
      tier: 1,
    },
    {
      url: "https://huggingface.co/blog/feed.xml",
      label: "HuggingFace Blog",
      tier: 1,
    },
    {
      url: "https://rss.arxiv.org/rss/cs.AI",
      label: "Arxiv AI (cs.AI)",
      tier: 2,
    },
    {
      url: "https://rss.arxiv.org/rss/cs.LG",
      label: "Arxiv ML (cs.LG)",
      tier: 2,
    },
    {
      url: "https://venturebeat.com/category/ai/feed/",
      label: "VentureBeat AI",
      tier: 2,
    },
    {
      url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      label: "TechCrunch AI",
      tier: 2,
    },
    {
      url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
      label: "MIT Technology Review AI",
      tier: 1,
    },
  ],

  // ── Technology / Software Engineering ────────────────────
  technology: [
    {
      url: "https://github.blog/feed/",
      label: "GitHub Blog",
      tier: 1,
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
      label: "Ars Technica Technology",
      tier: 2,
    },
    {
      url: "https://www.wired.com/feed/rss",
      label: "Wired",
      tier: 2,
    },
    {
      url: "https://news.ycombinator.com/rss",
      label: "Hacker News",
      tier: 3,
    },
    {
      url: "https://feeds.feedburner.com/ThePragmaticEngineer",
      label: "The Pragmatic Engineer",
      tier: 2,
    },
  ],

  // ── Open Source / Developer Tools ────────────────────────
  opensource: [
    {
      url: "https://github.blog/open-source/feed/",
      label: "GitHub Open Source",
      tier: 1,
    },
    {
      url: "https://opensource.com/feed",
      label: "Opensource.com",
      tier: 2,
    },
  ],

  // ── Systems Design / Engineering ─────────────────────────
  systems: [
    {
      url: "https://engineering.fb.com/feed/",
      label: "Meta Engineering",
      tier: 1,
    },
    {
      url: "https://netflixtechblog.com/feed",
      label: "Netflix Tech Blog",
      tier: 1,
    },
    {
      url: "https://aws.amazon.com/blogs/aws/feed/",
      label: "AWS Blog",
      tier: 1,
    },
  ],
};

export default sources;

// ============================================================
// Post store — read and write agent posts
// ============================================================

import { prisma } from "@/lib/prisma";
import type { FeedPost } from "@/types/agent";

/**
 * Retrieve all published posts for an agent, ordered newest first.
 * Formats the raw DB rows into the external FeedPost contract shape.
 */
export async function getFeedPosts(agentId: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((p) => ({
    id: p.id,
    createdAt: p.createdAt.toISOString(),
    text: p.text,
    rationale: p.rationale,
    sources: Array.isArray(p.sources) 
      ? (p.sources as { url: string }[]).map(s => {
          const match = s.url.match(/\[.*?\]\((.*?)\)/);
          return match ? match[1] : s.url;
        })
      : [],
  }));
}

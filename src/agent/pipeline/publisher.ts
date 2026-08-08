// ============================================================
// Publisher — commit post to DB stage
// ============================================================
// Persists the finished, critic-passed post to the Post table,
// creates bound Source rows, and marks the Topic as "chosen".
//
// Does NOT generate or judge content — pure DB write.
// ============================================================

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { DraftResult, Post, PostSource } from "@/types/agent";
import type { Prisma } from "@prisma/client";

// --------------- Helpers ---------------------------------

/** Map a raw Prisma Post row → domain Post type. */
function toPost(row: {
  id: string;
  agentId: string;
  topicId: string | null;
  text: string;
  rationale: string;
  sources: unknown;
  createdAt: Date;
}): Post {
  return {
    id: row.id,
    agentId: row.agentId,
    topicId: row.topicId ?? undefined,
    text: row.text,
    rationale: row.rationale,
    sources: row.sources as PostSource[],
    createdAt: row.createdAt,
  };
}

// --------------- Public API ------------------------------

/**
 * Persist a critic-approved draft to the database.
 *
 * Steps:
 *   1. Create a Post row with text, rationale, sources JSON, agentId, topicId
 *   2. Create Source rows for each item in sources (bound to the new postId)
 *   3. If topicId is provided, update Topic.status → "chosen"
 *   4. Log publisher start/finish
 *   5. Return the persisted Post record
 *
 * All DB writes are inside a single Prisma transaction so the
 * database remains consistent even if a step fails partway through.
 *
 * @param agentId   - The owning agent
 * @param draft     - { text, rationale } from the writer stage
 * @param sources   - Bound sources from the researcher stage
 * @param topicId   - The DB topic ID (optional; marks topic as "chosen")
 */
export async function commit(
  agentId: string,
  draft: DraftResult,
  sources: PostSource[],
  topicId?: string
): Promise<Post> {
  // ── Pre-flight validation ─────────────────────────────────
  if (!Array.isArray(sources)) {
    throw new Error(
      `publisher.commit: sources is not an array (got ${
        sources === undefined ? "undefined" : typeof sources
      }). Researcher must return a sources array.`
    );
  }
  if (!draft || typeof draft.text !== "string" || typeof draft.rationale !== "string") {
    throw new Error(
      "publisher.commit: draft is missing text or rationale fields."
    );
  }

  logger.info("publisher: Publisher Started", {
    agentId,
    topicId,
    sourceCount: sources.length,
    wordCount: draft.text.split(/\s+/).length,
  });

  // Serialise PostSource[] to the JSON shape stored in the Post.sources column.
  // Guard each source entry defensively.
  const sourcesJson: Prisma.InputJsonValue = sources.map((s) => ({
    url: s.url ?? "",
    fetchedAt: s.fetchedAt instanceof Date ? s.fetchedAt.toISOString() : new Date().toISOString(),
    factsExtracted: Array.isArray(s.factsExtracted) ? s.factsExtracted : [],
  }));

  // Execute all DB writes atomically.
  const post = await prisma.$transaction(async (tx) => {
    // ── 1. Create Post row ──────────────────────────────────
    const postRow = await tx.post.create({
      data: {
        agentId,
        topicId: topicId ?? null,
        text: draft.text,
        rationale: draft.rationale,
        sources: sourcesJson,
      },
    });

    // ── 2. Create Source rows ───────────────────────────────
    for (const src of sources) {
      await tx.source.create({
        data: {
          postId: postRow.id,
          url: src.url,
          fetchedAt: src.fetchedAt,
          factsExtracted:
            src.factsExtracted && src.factsExtracted.length > 0
              ? (src.factsExtracted as Prisma.InputJsonValue)
              : undefined,
        },
      });
    }

    // ── 3. Mark topic as "chosen" ───────────────────────────
    if (topicId) {
      await tx.topic.update({
        where: { id: topicId },
        data: { status: "chosen" },
      });
    }

    return postRow;
  });

  const result = toPost(post);

  logger.info("publisher: Publisher Finished", {
    agentId,
    postId: result.id,
    topicId,
    createdAt: result.createdAt.toISOString(),
  });

  return result;
}

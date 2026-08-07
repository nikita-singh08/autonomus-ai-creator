// ============================================================
// Publisher — commit post to DB stage
// ============================================================
// Persists the finished, critic-passed post to the database
// including rationale and bound sources.
//
// Does NOT generate or judge content — pure DB write.
//
// TODO (Milestone 3 – Publisher): Implement Prisma writes.

import { prisma } from "@/lib/prisma";
import type { DraftResult, Post, PostSource } from "@/types/agent";

/**
 * Persist a critic-approved draft to the Post table.
 *
 * @param agentId   - The owning agent
 * @param topicId   - The topic this post is about (optional)
 * @param draft     - { text, rationale } from the writer stage
 * @param sources   - Bound sources from the researcher stage
 * @returns         The persisted Post record
 *
 * TODO (Milestone 3):
 *   1. Create a Post row via prisma.post.create with all fields
 *   2. Create Source rows for each item in sources
 *   3. Update the Topic row status to "chosen"
 *   4. Return the created Post
 */
export async function commit(
  agentId: string,
  draft: DraftResult,
  sources: PostSource[],
  topicId?: string
): Promise<Post> {
  // TODO (Milestone 3): Replace stub with real Prisma implementation.
  void agentId;
  void draft;
  void sources;
  void topicId;
  throw new Error("publisher.commit not yet implemented — see TODO in src/agent/pipeline/publisher.ts");
}

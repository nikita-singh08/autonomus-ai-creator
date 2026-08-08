// ============================================================
// Orchestrator — sequences one full tick end-to-end
// ============================================================
// Runs: Scout → Curator → Researcher → Writer → Critic → Publisher
// Handles "hold" (curator skip) and "kill" (critic fail) outcomes.
// Writes a TickLog row for every run regardless of outcome.
//
// Does NOT implement any stage's logic — it only sequences calls.
// ============================================================

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { TickOutcome } from "@/types/agent";

import * as memory from "./memory";
import * as scout from "./pipeline/scout";
import * as curator from "./pipeline/curator";
import * as researcher from "./pipeline/researcher";
import * as writer from "./pipeline/writer";
import * as critic from "./pipeline/critic";
import * as publisher from "./pipeline/publisher";

export interface TickResult {
  outcome: TickOutcome;
  detail: string;
}

/**
 * Run one full agent pipeline cycle for the given agentId.
 *
 * Flow:
 *   1. memory.getPersona(agentId)
 *   2. memory.getRecentPosts(agentId)
 *   3. scout.discover(persona, agentId)
 *   4. curator.judge(candidates, recentPosts, persona, agentId)
 *      → if null: log "held", return
 *   5. researcher.gather(chosenTopic)
 *   6. writer.draft(research, persona, chosenTopic)
 *   7. critic.evaluate(draft, recentPosts, sources)
 *      → if fail: log "killed", return
 *   8. publisher.commit(agentId, draft, sources, topicId)
 *      → log "published"
 *
 * Supports manual execution — no background scheduling here.
 */
export async function runTick(agentId: string): Promise<TickResult> {
  const startedAt = new Date();
  logger.info("orchestrator.runTick started", { agentId });

  let outcome: TickOutcome = "held";
  let detail = "";

  try {
    // ── 1. Load persona ──────────────────────────────────────
    const persona = await memory.getPersona(agentId);

    // ── 2. Load recent posts for context / dedupe ────────────
    const recentPosts = await memory.getRecentPosts(agentId, 20);

    // ── 3. Scout: discover candidate topics ──────────────────
    const candidates = await scout.discover(persona, agentId);

    if (candidates.length === 0) {
      outcome = "held";
      detail = "Scout returned no candidates — no eligible topics found this cycle.";
      logger.info("orchestrator.runTick: held — no candidates", { agentId });
    } else {
      // ── 4. Curator: score and select best topic ─────────────
      const curatorResult = await curator.judge(
        candidates,
        recentPosts,
        persona,
        agentId
      );

      if (!curatorResult.chosenTopic) {
        outcome = "held";
        detail = `Curator held: ${curatorResult.reasoning}`;
        logger.info("orchestrator.runTick: held — curator skipped", {
          agentId,
          reasoning: curatorResult.reasoning,
        });
      } else {
        const chosenTopic = curatorResult.chosenTopic;

        // Find the DB topic ID for the chosen topic (for publisher).
        const dbTopic = await prisma.topic.findFirst({
          where: { agentId, url: chosenTopic.url },
          select: { id: true },
        });

        // ── 5. Researcher: gather facts ──────────────────────
        const research = await researcher.gather(chosenTopic);

        // ── 6. Writer: generate post text ───────────────────
        const draftResult = await writer.draft(research, persona, chosenTopic);

        // ── 7. Critic: run integrity gates ──────────────────
        const criticResult = await critic.evaluate(
          draftResult,
          recentPosts,
          research.sources
        );

        if (!criticResult.pass) {
          outcome = "killed";
          detail = `Critic rejected draft: ${criticResult.reason}`;
          logger.info("orchestrator.runTick: killed — critic rejected", {
            agentId,
            reason: criticResult.reason,
          });
        } else {
          // ── 8. Publisher: persist post ───────────────────
          const post = await publisher.commit(
            agentId,
            draftResult,
            research.sources,
            dbTopic?.id
          );

          outcome = "published";
          detail = `Published post ${post.id} on topic: "${chosenTopic.title}". Critic score: ${criticResult.score}.`;
          logger.info("orchestrator.runTick: published", {
            agentId,
            postId: post.id,
            topicTitle: chosenTopic.title,
          });
        }
      }
    }
  } catch (err) {
    // Unexpected error — log it and mark as killed so TickLog reflects the failure.
    outcome = "killed";
    detail = `Unhandled error: ${err instanceof Error ? err.message : String(err)}`;
    logger.error("orchestrator.runTick: unhandled error", {
      agentId,
      error: detail,
    });
  }

  // Always write a TickLog row so every run is auditable.
  try {
    await prisma.tickLog.create({
      data: {
        agentId,
        ranAt: startedAt,
        outcome,
        detail,
      },
    });
  } catch (err) {
    logger.error("orchestrator.runTick: failed to write TickLog", {
      agentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info("orchestrator.runTick finished", { agentId, outcome, detail });
  return { outcome, detail };
}

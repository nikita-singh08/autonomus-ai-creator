// ============================================================
// Orchestrator — sequences one full tick end-to-end
// ============================================================
// Runs: Scout → Curator → Researcher → Writer → Critic → Publisher
// Handles "hold" (curator skip) and "kill" (critic fail) outcomes.
// Writes a TickLog row for every run regardless of outcome.
//
// Does NOT implement any stage's logic — it only sequences calls.
//
// TODO (Milestone 2): Wire up no-op tick that just writes TickLog.
// TODO (Milestone 3): Uncomment each stage call as they are implemented.

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { TickOutcome } from "@/types/agent";

// TODO (Milestone 3): Uncomment imports as each stage is implemented.
// import * as memory from "./memory";
// import * as scout from "./pipeline/scout";
// import * as curator from "./pipeline/curator";
// import * as researcher from "./pipeline/researcher";
// import * as writer from "./pipeline/writer";
// import * as critic from "./pipeline/critic";
// import * as publisher from "./pipeline/publisher";

export interface TickResult {
  outcome: TickOutcome;
  detail: string;
}

/**
 * Run one full agent pipeline cycle for the given agentId.
 *
 * TODO (Milestone 2): Replace the stub body with a no-op that logs a TickLog row.
 * TODO (Milestone 3): Uncomment each stage sequentially as they are built.
 *
 * Full flow (for reference, do not implement yet):
 *   1. memory.getPersona(agentId)
 *   2. memory.getRecentPosts(agentId)
 *   3. scout.discover(persona, seenUrls)
 *   4. curator.judge(candidates, recentPosts, persona)
 *      → if null: log "held", return
 *   5. researcher.gather(chosenTopic)
 *   6. writer.draft(research, persona)
 *   7. critic.evaluate(draft, recentPosts, sources)
 *      → if fail: log "killed", return (or retry once)
 *   8. publisher.commit(agentId, draft, sources, topicId)
 *      → log "published"
 */
export async function runTick(agentId: string): Promise<TickResult> {
  const startedAt = new Date();
  logger.info("orchestrator.runTick started", { agentId });

  // TODO (Milestone 2): Replace with real pipeline invocations.
  const outcome: TickOutcome = "held";
  const detail = "Orchestrator not yet implemented — no-op placeholder.";

  // Always write a TickLog row so the scheduler is visibly alive.
  await prisma.tickLog.create({
    data: {
      agentId,
      ranAt: startedAt,
      outcome,
      detail,
    },
  });

  logger.info("orchestrator.runTick finished", { agentId, outcome, detail });
  return { outcome, detail };
}

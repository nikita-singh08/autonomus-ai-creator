// ============================================================
// scripts/cron-tick.ts
// Standalone script called by an external scheduler.
// ============================================================
// Loads ALL agents from the database and runs one orchestrator
// tick per agent.  A failure in one agent does NOT stop the
// others — each agent is processed independently.
//
// Compatible scheduler environments (provider-independent):
//   - GitHub Actions  (schedule: cron: '...')
//   - Railway cron    (runs this script directly)
//   - cron-job.org    (hits POST /api/agent/tick instead)
//   - Any POSIX cron  (npx tsx scripts/cron-tick.ts)
//
// Required environment variables:
//   DATABASE_URL  — Prisma SQLite path (file:./prisma/dev.db)
//   GROQ_API_KEY  — LLM provider key
//
// Optional: set AGENT_ID to restrict execution to a single agent.
// ============================================================

import { runTick } from "../src/agent/orchestrator";
import { logger } from "../src/lib/logger";
import { prisma } from "../src/lib/prisma";

async function main() {
  logger.info("cron-tick: scheduler run started");

  // ── Resolve agent list ────────────────────────────────────
  const specificId = process.env.AGENT_ID?.trim();

  let agentIds: string[];

  if (specificId) {
    // Single-agent mode: honour AGENT_ID override.
    logger.info("cron-tick: AGENT_ID override — single-agent mode", {
      agentId: specificId,
    });
    agentIds = [specificId];
  } else {
    // Multi-agent mode: process every agent in the database.
    const agents = await prisma.agent.findMany({ select: { id: true } });
    if (agents.length === 0) {
      logger.warn(
        "cron-tick: no agents found in database — nothing to process. " +
        "Run POST /api/agent/init to create an agent."
      );
      await prisma.$disconnect();
      process.exit(0);
    }
    agentIds = agents.map((a) => a.id);
    logger.info("cron-tick: multi-agent mode", { count: agentIds.length });
  }

  // ── Process each agent independently ─────────────────────
  let successCount = 0;
  let failCount = 0;

  for (const agentId of agentIds) {
    logger.info("cron-tick: starting tick", { agentId });
    try {
      const result = await runTick(agentId);
      logger.info("cron-tick: tick complete", {
        agentId,
        outcome: result.outcome,
        durationMs: result.durationMs,
        detail: result.detail,
        ...(result.postId ? { postId: result.postId } : {}),
      });
      successCount++;
    } catch (err) {
      // Log but continue — one agent failure must not halt others.
      logger.error("cron-tick: tick failed", {
        agentId,
        error: err instanceof Error ? err.message : String(err),
      });
      failCount++;
    }
  }

  logger.info("cron-tick: scheduler run complete", {
    total: agentIds.length,
    successCount,
    failCount,
  });

  await prisma.$disconnect();

  // Exit 0 so the cron host does not mark the job as failed when
  // individual agents error but others succeed.
  process.exit(0);
}

main().catch((err) => {
  logger.error("cron-tick: fatal unhandled error", {
    error: err instanceof Error ? err.message : String(err),
  });
  prisma.$disconnect().finally(() => process.exit(1));
});

// ============================================================
// scripts/cron-tick.ts
// Standalone script called by an external scheduler.
// ============================================================
// This script calls orchestrator.runTick() directly (not via HTTP)
// so it can be triggered by: cron-job.org, Railway cron, or a
// GitHub Action on a schedule hitting /api/agent/tick.
//
// TODO (Milestone 2): Run this script in a test environment and
// confirm it writes a TickLog row reliably before trusting the scheduler.

import { runTick } from "../src/agent/orchestrator";
import { logger } from "../src/lib/logger";

async function main() {
  // TODO (Milestone 2): Read agentId from env or CLI arg.
  const agentId = process.env.AGENT_ID;

  if (!agentId) {
    logger.error("cron-tick: AGENT_ID env var is required");
    process.exit(1);
  }

  logger.info("cron-tick: starting tick", { agentId });

  try {
    const result = await runTick(agentId);
    logger.info("cron-tick: tick complete", { agentId, ...result });
    process.exit(0);
  } catch (err) {
    logger.error("cron-tick: tick failed", { agentId, error: String(err) });
    process.exit(1);
  }
}

main();

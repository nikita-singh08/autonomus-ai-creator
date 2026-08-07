// ============================================================
// POST /api/agent/tick
// ============================================================
// Cron-triggered internal endpoint.
// Receives a POST from the external scheduler and delegates to
// orchestrator.runTick(agentId).
//
// TODO (Milestone 2): Verify this endpoint fires reliably from external scheduler.
// TODO (Milestone 3): orchestrator.runTick will invoke the full pipeline once stages are built.

import { NextRequest, NextResponse } from "next/server";
import { runTick } from "@/agent/orchestrator";
import { logger } from "@/lib/logger";
import type { TickRequest, TickResponse } from "@/types/agent";

export async function POST(req: NextRequest) {
  try {
    const body: TickRequest = await req.json().catch(() => ({}));
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing required body field: agentId" },
        { status: 400 }
      );
    }

    logger.info("POST /api/agent/tick received", { agentId });

    const result = await runTick(agentId);

    const response: TickResponse = {
      outcome: result.outcome,
      detail: result.detail,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    logger.error("POST /api/agent/tick failed", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

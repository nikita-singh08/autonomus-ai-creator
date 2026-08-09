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
import { prisma } from "@/lib/prisma";
import { runTick } from "@/agent/orchestrator";
import { logger } from "@/lib/logger";
import type { TickRequest } from "@/types/agent";

export async function POST(req: NextRequest) {
  try {
    const body: TickRequest = await req.json().catch(() => ({}));
    let targetAgentId = body.agentId;

    if (!targetAgentId) {
      const latestAgent = await prisma.agent.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!latestAgent) {
        return NextResponse.json(
          { success: false, error: "No agents initialized yet" },
          { status: 404 }
        );
      }
      targetAgentId = latestAgent.id;
    }

    logger.info("POST /api/agent/tick received", { targetAgentId });

    // Validate the agent exists before firing the cycle.
    const agent = await prisma.agent.findUnique({
      where: { id: targetAgentId },
      select: { id: true },
    });
    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${targetAgentId}` },
        { status: 404 }
      );
    }

    const result = await runTick(targetAgentId);

    return NextResponse.json(
      {
        success: true,
        outcome: result.outcome,
        detail: result.detail,
        durationMs: result.durationMs,
        ...(result.postId ? { postId: result.postId } : {}),
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error("POST /api/agent/tick failed", { error: String(error) });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================
// TEMPORARY DEBUG ENDPOINT — MUST NOT BE EXPOSED AS A PUBLIC
// PRODUCTION CONTROL ENDPOINT.  Remove or gate behind auth
// before going to production.
// ============================================================
// Endpoint: GET /api/debug/tick
//
// Purpose:
//   Manually execute exactly one full orchestrator cycle during
//   development and testing.  Runs the complete pipeline:
//   Scout → Curator → Researcher → Writer → Critic → Publisher
//
// Usage:
//   GET /api/debug/tick?agentId=<agentId>
//
//   If agentId is omitted, the first agent in the database is used.
//
// Response:
//   {
//     success: true,
//     outcome: "published" | "held" | "killed",
//     detail: "...",
//     durationMs: 1234,
//     post?: { id, text, rationale, sources, createdAt }   // only when published
//   }
//
// DO NOT use this endpoint as a production cron trigger.
// Use POST /api/agent/tick for programmatic/scheduler access.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runTick } from "@/agent/orchestrator";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // ── Resolve agentId ──────────────────────────────────────
    const { searchParams } = new URL(req.url);
    let agentId = searchParams.get("agentId") ?? undefined;

    if (!agentId) {
      // Fallback: use the first agent found in the database.
      const firstAgent = await prisma.agent.findFirst({
        select: { id: true },
      });
      if (!firstAgent) {
        return NextResponse.json(
          {
            success: false,
            reason:
              "No agentId provided and no agents found in the database. " +
              "Run POST /api/agent/init first, then pass ?agentId=<id>.",
          },
          { status: 400 }
        );
      }
      agentId = firstAgent.id;
      logger.info("debug/tick: no agentId in query; using first agent", {
        agentId,
      });
    }

    logger.info("debug/tick: starting tick", { agentId });

    // ── Run one full orchestrator cycle ──────────────────────
    const result = await runTick(agentId);

    logger.info("debug/tick: tick complete", {
      agentId,
      outcome: result.outcome,
      durationMs: result.durationMs,
    });

    // ── Optionally fetch the published post for the response ──
    let post: {
      id: string;
      text: string;
      rationale: string;
      sources: unknown;
      createdAt: string;
    } | undefined;

    if (result.outcome === "published" && result.postId) {
      const row = await prisma.post.findUnique({
        where: { id: result.postId },
      });
      if (row) {
        post = {
          id: row.id,
          text: row.text,
          rationale: row.rationale,
          sources: row.sources,
          createdAt: row.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      outcome: result.outcome,
      detail: result.detail,
      durationMs: result.durationMs,
      ...(post ? { post } : {}),
    });
  } catch (err) {
    logger.error("debug/tick: unhandled error", {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        success: false,
        reason:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during the debug tick.",
      },
      { status: 500 }
    );
  }
}

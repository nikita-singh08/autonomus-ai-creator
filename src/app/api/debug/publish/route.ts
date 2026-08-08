// ============================================================
// TEMPORARY DEBUG ENDPOINT — MUST BE REMOVED BEFORE FINAL DEPLOYMENT
// ============================================================
// Endpoint: GET /api/debug/publish
//
// Purpose:
//   Manually trigger the publishing pipeline for testing and
//   development.  Runs Researcher → Writer → Critic → Publisher
//   against the most recently "chosen" topic for the first agent.
//
//   Does NOT run Scout or Curator — assumes a chosen topic already
//   exists in the database (e.g., created by /api/debug/scout then
//   manually advanced, or by running the full orchestrator once).
//
// Response:
//   { published: true,  post: { id, text, rationale, sources, createdAt } }
//   { published: false, reason: "..." }
//
// DO NOT expose this endpoint in production.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersona, getRecentPosts } from "@/agent/memory";
import { gather } from "@/agent/pipeline/researcher";
import { draft } from "@/agent/pipeline/writer";
import { evaluate } from "@/agent/pipeline/critic";
import { commit } from "@/agent/pipeline/publisher";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // ── Resolve agent ────────────────────────────────────────
    const agent = await prisma.agent.findFirst();
    if (!agent) {
      return NextResponse.json(
        { published: false, reason: "No agent found. Run POST /api/agent/init first." },
        { status: 400 }
      );
    }

    // ── Load persona and recent posts ────────────────────────
    const persona = await getPersona(agent.id);
    const recentPosts = await getRecentPosts(agent.id, 20);

    // ── Find the most recent "chosen" or "candidate" topic ───
    // Prefer "chosen"; fall back to the freshest "candidate".
    let dbTopic = await prisma.topic.findFirst({
      where: { agentId: agent.id, status: "chosen" },
      orderBy: { discoveredAt: "desc" },
    });

    if (!dbTopic) {
      dbTopic = await prisma.topic.findFirst({
        where: { agentId: agent.id, status: "candidate" },
        orderBy: { discoveredAt: "desc" },
      });
    }

    if (!dbTopic) {
      return NextResponse.json(
        {
          published: false,
          reason:
            "No eligible topics found (status: chosen or candidate). Run GET /api/debug/scout first to discover topics.",
        },
        { status: 400 }
      );
    }

    const topic = {
      title: dbTopic.title,
      url: dbTopic.url,
    };

    // ── Researcher ───────────────────────────────────────────
    const research = await gather(topic);

    // Inter-stage validation: researcher must return valid array fields.
    if (!Array.isArray(research.facts)) {
      throw new Error(
        `Pipeline error: researcher returned invalid facts (got ${typeof research.facts}). ` +
        `Expected BoundFact[].`
      );
    }
    if (!Array.isArray(research.sources) || research.sources.length === 0) {
      throw new Error(
        `Pipeline error: researcher returned no sources (got ${
          Array.isArray(research.sources) ? "empty array" : typeof research.sources
        }). At least one source is required.`
      );
    }

    // ── Writer ───────────────────────────────────────────────
    const draftResult = await draft(research, persona, topic);

    // ── Critic ───────────────────────────────────────────────
    const criticResult = await evaluate(draftResult, recentPosts, research.sources);

    if (!criticResult.pass) {
      logger.info("debug/publish: critic rejected draft", {
        reason: criticResult.reason,
        score: criticResult.score,
      });
      return NextResponse.json({
        published: false,
        reason: criticResult.reason,
        score: criticResult.score,
      });
    }

    // ── Publisher ────────────────────────────────────────────
    const post = await commit(
      agent.id,
      draftResult,
      research.sources,
      dbTopic.id
    );

    return NextResponse.json({
      published: true,
      post: {
        id: post.id,
        text: post.text,
        rationale: post.rationale,
        sources: post.sources,
        createdAt: post.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error("debug/publish: unhandled error", {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        published: false,
        reason:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred in the publish pipeline.",
      },
      { status: 500 }
    );
  }
}

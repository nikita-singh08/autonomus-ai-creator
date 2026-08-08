// ============================================================
// TEMPORARY DEBUG ENDPOINT - MUST BE REMOVED BEFORE DEPLOYMENT
// ============================================================
// Endpoint: GET /api/debug/scout
// Purpose: Execute only the Scout pipeline for testing and development.
// Does NOT call Curator, Researcher, Writer, or Publisher.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersona } from "@/agent/memory";
import { discover } from "@/agent/pipeline/scout";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // For debugging, we just pick the first available agent.
    // In a real scenario, the agentId would be passed in or resolved from auth.
    const agent = await prisma.agent.findFirst();
    
    if (!agent) {
      return NextResponse.json(
        { error: "No agents found in the database. Please initialize an agent first." },
        { status: 400 }
      );
    }

    const persona = await getPersona(agent.id);
    
    // Execute ONLY the scout pipeline
    const candidates = await discover(persona, agent.id);

    // Map to required JSON response format
    const topics = candidates.map((c) => ({
      title: c.title,
      url: c.url,
      status: "candidate", // Scout always produces candidates
    }));

    return NextResponse.json({
      count: topics.length,
      topics,
    });
  } catch (error) {
    logger.error("Debug scout endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return NextResponse.json(
      { error: "Failed to execute scout pipeline" },
      { status: 500 }
    );
  }
}

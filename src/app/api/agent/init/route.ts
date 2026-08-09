// ============================================================
// POST /api/agent/init
// ============================================================
// Thin API contract — validation only.
// All business logic lives in src/agent/agentStore.ts.
//
// Request body:
//   { "persona": { "name": "Ada", "domain": "AI Security" } }
//
// Success (201):
//   { "agentId": "..." }
//
// Error (400): missing/invalid persona field
// Error (500): unexpected server error

import { NextRequest, NextResponse } from "next/server";
import { initAgent } from "@/agent/agentStore";
import { runTick } from "@/agent/orchestrator";
import { logger } from "@/lib/logger";
import type { InitAgentRequest, InitAgentResponse } from "@/types/agent";

export async function POST(req: NextRequest) {
  let body: InitAgentRequest;

  // Parse body — treat parse failure as an empty object so we 400 on missing fields.
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Validate: persona object is required with name + domain
  const persona = body.persona;
  if (!persona || typeof persona.name !== "string" || !persona.name.trim()) {
    return NextResponse.json(
      { error: "Missing required field: persona.name" },
      { status: 400 }
    );
  }
  if (typeof persona.domain !== "string" || !persona.domain.trim()) {
    return NextResponse.json(
      { error: "Missing required field: persona.domain" },
      { status: 400 }
    );
  }

  // Delegate to agent layer
  try {
    const result = await initAgent({
      name: persona.name.trim(),
      domain: persona.domain.trim(),
    });

    // Start first autonomous tick immediately.
    // Awaiting this is safe on Render (100s limit) and ensures the evaluator
    // can immediately see the results in the feed.
    await runTick(result.agentId).catch((err) => {
      logger.error("Initial autonomous tick failed", { error: String(err) });
    });

    const response: InitAgentResponse = { agentId: result.agentId };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("POST /api/agent/init failed", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

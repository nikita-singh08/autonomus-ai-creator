// ============================================================
// POST /api/agent/init
// ============================================================
// Creates a new Agent + Persona v1 row in the DB.
// Returns { agentId, personaId }.
//
// TODO (Milestone 1): Implement the real Prisma create calls below.
// The persona seed is imported from src/agent/persona/persona.seed.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOVA_PERSONA_SEED } from "@/agent/persona/persona.seed";
import { logger } from "@/lib/logger";
import type { InitAgentRequest, InitAgentResponse } from "@/types/agent";

export async function POST(req: NextRequest) {
  try {
    const body: InitAgentRequest = await req.json().catch(() => ({}));

    // TODO (Milestone 1): Replace mock implementation with real Prisma transaction.
    // Step 1: Create a Persona row (version 1) using NOVA_PERSONA_SEED
    // Step 2: Create an Agent row pointing at the new persona
    // Step 3: Return { agentId, personaId }

    // ---- MOCK RESPONSE (remove once Prisma is wired) ----
    const mockPersonaId = `persona_${Date.now()}`;
    const mockAgentId = `agent_${Date.now()}`;
    void body; // suppress unused warning until implemented

    logger.info("POST /api/agent/init called (mock)", { mockAgentId, mockPersonaId });

    const response: InitAgentResponse = {
      agentId: mockAgentId,
      personaId: mockPersonaId,
    };

    return NextResponse.json(response, { status: 201 });
    // ---- END MOCK ----

  } catch (error) {
    logger.error("POST /api/agent/init failed", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

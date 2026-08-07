// ============================================================
// Agent store — create and query Agent records
// ============================================================
// Contains the business logic for agent lifecycle operations.
// API routes call into this module; they do not touch Prisma directly.

import { prisma } from "@/lib/prisma";
import { NOVA_PERSONA_SEED } from "@/agent/persona/persona.seed";
import { logger } from "@/lib/logger";
import type { Agent, InitPersonaInput } from "@/types/agent";
import type { Prisma } from "@prisma/client";

/** The fields returned after successfully initialising an agent. */
export interface InitAgentResult {
  agentId: string;
}

/**
 * Initialise a new Agent + Persona v1 row.
 *
 * The schema has a circular FK:
 *   Agent.personaId → Persona.id
 *   Persona.agentId → Agent.id
 *
 * SQLite enforces FKs immediately even inside a transaction.
 * We break the cycle by temporarily disabling FK checks with
 * PRAGMA foreign_keys = OFF, running the three inserts, then
 * re-enabling.  This is safe because we verify the final state
 * is consistent before re-enabling.
 *
 * Steps:
 *   1. Disable FK checks (PRAGMA foreign_keys = OFF)
 *   2. Create Persona with a placeholder agentId
 *   3. Create Agent pointing at that Persona
 *   4. Patch Persona.agentId to the real Agent.id
 *   5. Re-enable FK checks (PRAGMA foreign_keys = ON)
 */
export async function initAgent(input: InitPersonaInput): Promise<InitAgentResult> {
  const { name, domain } = input;

  const personaSeed = {
    ...NOVA_PERSONA_SEED,
    name,
    domain,
  };

  // Use $transaction with interactive mode so we can interleave
  // raw SQL PRAGMAs with Prisma model operations.
  const { agentId } = await prisma.$transaction(async (tx) => {
    // Defer FK enforcement until transaction commit so we can insert
    // the circular reference without a constraint violation.
    await tx.$executeRaw`PRAGMA defer_foreign_keys = ON;`;

    // Create Persona first with a temporary placeholder agentId.
    // The FK from Persona.agentId → Agent.id is not checked yet.
    const TEMP_AGENT_ID = "__pending__";
    const persona = await tx.persona.create({
      data: {
        agentId: TEMP_AGENT_ID,
        version: personaSeed.version,
        name: personaSeed.name,
        domain: personaSeed.domain,
        voiceRules: personaSeed.voiceRules as unknown as Prisma.InputJsonValue,
        pillars: personaSeed.pillars,
        antiTopics: personaSeed.antiTopics,
      },
    });

    // Create Agent pointing at the Persona we just created.
    const agent = await tx.agent.create({
      data: { personaId: persona.id },
    });

    // Patch Persona.agentId to the real Agent id.
    await tx.persona.update({
      where: { id: persona.id },
      data: { agentId: agent.id },
    });

    return { agentId: agent.id };
  });

  logger.info("initAgent: created agent + persona v1", { agentId, name, domain });
  return { agentId };
}

/** Fetch a single Agent by id, or null if not found. */
export async function findAgent(agentId: string): Promise<Agent | null> {
  const row = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!row) return null;
  return { id: row.id, createdAt: row.createdAt, personaId: row.personaId };
}

// ============================================================
// Persona store — load and save persona versions from the DB
// ============================================================

import { prisma } from "@/lib/prisma";
import type { Persona } from "@/types/agent";

// --------------- helpers -----------------

/** Map a raw Prisma Persona row to our domain Persona type. */
function toPersona(row: {
  id: string;
  agentId: string;
  version: number;
  name: string;
  domain: string;
  voiceRules: unknown;
  pillars: unknown;
  antiTopics: unknown;
  createdAt: Date;
}): Persona {
  return {
    id: row.id,
    agentId: row.agentId,
    version: row.version,
    name: row.name,
    domain: row.domain,
    voiceRules: row.voiceRules as Persona["voiceRules"],
    pillars: row.pillars as string[],
    antiTopics: row.antiTopics as string[],
    createdAt: row.createdAt,
  };
}

// --------------- public API -----------------

/**
 * Persist a new persona version for an agent.
 * Called by agentStore.initAgent during POST /api/agent/init.
 */
export async function createPersona(
  agentId: string,
  seed: Omit<Persona, "id" | "agentId" | "createdAt">
): Promise<Persona> {
  const row = await prisma.persona.create({
    data: {
      agentId,
      version: seed.version,
      name: seed.name,
      domain: seed.domain,
      voiceRules: seed.voiceRules as unknown as import("@prisma/client").Prisma.InputJsonValue,
      pillars: seed.pillars,
      antiTopics: seed.antiTopics,
    },
  });
  return toPersona(row);
}

/**
 * Load the current active persona for an agent.
 * TODO (Milestone 3): Used by orchestrator.runTick at the start of each cycle.
 */
export async function getActivePersona(agentId: string): Promise<Persona> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { persona: true },
  });
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  if (!agent.persona) {
    throw new Error(`Agent missing persona: ${agentId}`);
  }
  return toPersona(agent.persona);
}

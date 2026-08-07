// ============================================================
// Persona store — load and save persona versions from the DB
// ============================================================
// TODO (Milestone 1 – Init): Implement createPersona used by the init route.
// TODO (Milestone 3 – Orchestrator): Implement getActivePersona used every tick.

import { prisma } from "@/lib/prisma";
import type { Persona } from "@/types/agent";
// Note: Omit<T, K> is a native TypeScript utility type — no import needed.

/**
 * Persist a new persona version for an agent.
 *
 * TODO (Milestone 1): Wire into POST /api/agent/init.
 */
export async function createPersona(
  agentId: string,
  seed: Omit<Persona, "id" | "agentId" | "createdAt">
): Promise<Persona> {
  // TODO (Milestone 1): implement Prisma create call.
  void agentId;
  void seed;
  throw new Error("createPersona not yet implemented — see TODO in src/agent/persona/personaStore.ts");
}

/**
 * Load the current active persona for an agent.
 *
 * TODO (Milestone 3): Used by orchestrator.runTick at the start of each cycle.
 */
export async function getActivePersona(agentId: string): Promise<Persona> {
  // TODO (Milestone 3): implement Prisma findFirst call via Agent.personaId.
  void agentId;
  throw new Error("getActivePersona not yet implemented — see TODO in src/agent/persona/personaStore.ts");
}

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
 * Default voiceRules written to every new Persona.
 * Matches the schema expected by writer.ts and memory.ts toVoiceRules().
 */
const DEFAULT_VOICE_RULES: Prisma.InputJsonValue = {
  bannedPhrases: [
    "game changer",
    "groundbreaking",
    "revolutionary",
    "disruptive",
    "paradigm shift",
  ],
  toneDescription:
    "Curious, precise, and direct. Prefers concrete specifics over sweeping generalisations. Never hypes.",
  styleNotes:
    "Write in short paragraphs. Cite facts with source references. Avoid filler intros.",
};

/** Default pillars written to every new Persona. */
const DEFAULT_PILLARS: string[] = [
  "artificial intelligence",
  "software engineering",
  "developer tools",
  "open source",
  "systems design",
];

/** Default anti-topics written to every new Persona. */
const DEFAULT_ANTI_TOPICS: string[] = [
  "celebrity gossip",
  "sports",
  "politics",
  "cryptocurrency speculation",
  "NFTs",
];

/**
 * Initialise a new Agent + Persona v1 row.
 *
 * The schema has a circular FK:
 *   Agent.personaId → Persona.id
 *   Persona.agentId → Agent.id
 *
 * Strategy (cross-database safe):
 *   1. Detect whether we're on SQLite or PostgreSQL.
 *   2. On SQLite: use PRAGMA defer_foreign_keys = ON inside a transaction.
 *   3. On PostgreSQL: use SET CONSTRAINTS ALL DEFERRED inside a transaction.
 *
 * Both paths result in the same three logical operations:
 *   a. Create Persona with a placeholder agentId ("__pending__")
 *   b. Create Agent pointing at that Persona
 *   c. Patch Persona.agentId to the real Agent.id
 */
export async function initAgent(input: InitPersonaInput): Promise<InitAgentResult> {
  const { name, domain } = input;

  // Resolve persona config — always use seed + defaults so JSON fields are complete.
  const seedVoiceRules = NOVA_PERSONA_SEED.voiceRules;
  const voiceRules: Prisma.InputJsonValue =
    seedVoiceRules &&
    Array.isArray(seedVoiceRules.bannedPhrases) &&
    typeof seedVoiceRules.toneDescription === "string" &&
    typeof seedVoiceRules.styleNotes === "string"
      ? {
          bannedPhrases:    seedVoiceRules.bannedPhrases,
          toneDescription:  seedVoiceRules.toneDescription,
          styleNotes:       seedVoiceRules.styleNotes,
        }
      : DEFAULT_VOICE_RULES;

  const pillars: string[] =
    Array.isArray(NOVA_PERSONA_SEED.pillars) && NOVA_PERSONA_SEED.pillars.length > 0
      ? NOVA_PERSONA_SEED.pillars
      : DEFAULT_PILLARS;

  const antiTopics: string[] =
    Array.isArray(NOVA_PERSONA_SEED.antiTopics) && NOVA_PERSONA_SEED.antiTopics.length > 0
      ? NOVA_PERSONA_SEED.antiTopics
      : DEFAULT_ANTI_TOPICS;

  // Detect which database provider is in use.
  const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const isPostgres = !DATABASE_URL.startsWith("file:");

  const TEMP_AGENT_ID = "__pending__";

  let agentId: string;

  if (isPostgres) {
    // ── PostgreSQL path ────────────────────────────────────────────────
    // PostgreSQL supports deferrable FK constraints.  We defer ALL
    // constraints until the end of the transaction using a raw SQL
    // statement.  This lets us insert the circular reference safely.
    agentId = await prisma.$transaction(async (tx) => {
      // Defer all FK constraints to end-of-transaction.
      await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;

      const persona = await tx.persona.create({
        data: {
          agentId: TEMP_AGENT_ID,
          version: NOVA_PERSONA_SEED.version,
          name,
          domain,
          voiceRules,
          pillars,
          antiTopics,
        },
      });

      const agent = await tx.agent.create({
        data: { personaId: persona.id },
      });

      await tx.persona.update({
        where: { id: persona.id },
        data:  { agentId: agent.id },
      });

      return agent.id;
    });
  } else {
    // ── SQLite path (local development) ───────────────────────────────
    // SQLite enforces FKs at statement level inside transactions.
    // PRAGMA defer_foreign_keys = ON defers them until the transaction
    // commits, breaking the circular dependency safely.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`PRAGMA defer_foreign_keys = ON;`;

      const persona = await tx.persona.create({
        data: {
          agentId: TEMP_AGENT_ID,
          version: NOVA_PERSONA_SEED.version,
          name,
          domain,
          voiceRules,
          pillars,
          antiTopics,
        },
      });

      const agent = await tx.agent.create({
        data: { personaId: persona.id },
      });

      await tx.persona.update({
        where: { id: persona.id },
        data:  { agentId: agent.id },
      });

      return { agentId: agent.id };
    });
    agentId = result.agentId;
  }

  logger.info("initAgent: created agent + persona v1", { agentId, name, domain });
  return { agentId };
}

/** Fetch a single Agent by id, or null if not found. */
export async function findAgent(agentId: string): Promise<Agent | null> {
  const row = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!row) return null;
  return { id: row.id, createdAt: row.createdAt, personaId: row.personaId };
}

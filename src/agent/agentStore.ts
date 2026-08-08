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

  // Since Agent.personaId is now optional, we can break the circular dependency
  // without database-specific constraint deferral hacks.
  const agentId = await prisma.$transaction(async (tx) => {
    // 1. Create the Agent first, leaving personaId null.
    const agent = await tx.agent.create({
      data: {},
    });

    // 2. Create the Persona pointing to the newly created Agent.
    const persona = await tx.persona.create({
      data: {
        agentId: agent.id,
        version: NOVA_PERSONA_SEED.version,
        name,
        domain,
        voiceRules,
        pillars,
        antiTopics,
      },
    });

    // 3. Update the Agent with the active personaId.
    await tx.agent.update({
      where: { id: agent.id },
      data:  { personaId: persona.id },
    });

    return agent.id;
  });

  logger.info("initAgent: created agent + persona v1", { agentId, name, domain });
  return { agentId };
}

/** Fetch a single Agent by id, or null if not found. */
export async function findAgent(agentId: string): Promise<Agent | null> {
  const row = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!row) return null;
  if (!row.personaId) throw new Error("Agent missing personaId (init incomplete)");
  return { id: row.id, createdAt: row.createdAt, personaId: row.personaId };
}

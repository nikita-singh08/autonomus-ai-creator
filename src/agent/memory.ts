// ============================================================
// Memory module — pure data access layer for the agent
// ============================================================
// Queries past posts and topics for deduplication and context injection.
// This module contains NO decision logic — it only reads/writes data.
// ============================================================

import { prisma } from "@/lib/prisma";
import type { Agent, Persona, Post, PostSource, Topic } from "@/types/agent";

// --------------- Persona defaults -----------------------

/**
 * The minimum valid VoiceRules object.
 * Applied as a fallback when a DB row's JSON is missing fields.
 * Matches the schema expected by writer.ts validatePersona().
 */
const DEFAULT_VOICE_RULES = {
  bannedPhrases: [] as string[],
  toneDescription: "Professional AI and technology analyst.",
  styleNotes: "Clear, factual, insightful, concise.",
};

/** Default pillars for the AI/tech domain. */
const DEFAULT_PILLARS: string[] = [
  "artificial intelligence",
  "software engineering",
  "developer tools",
  "open source",
  "systems design",
];

/** Default anti-topics. */
const DEFAULT_ANTI_TOPICS: string[] = [
  "celebrity gossip",
  "sports",
  "politics",
  "cryptocurrency speculation",
  "NFTs",
];

// --------------- Helpers ---------------------------------

/**
 * Safely coerce an unknown DB value to a string array.
 * Returns `fallback` if the value is not a real string[].
 */
function toStringArray(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw) && raw.every((v) => typeof v === "string")) {
    return raw as string[];
  }
  return fallback;
}

/**
 * Safely coerce the `voiceRules` JSON column to a VoiceRules object.
 * Any missing sub-field is filled from DEFAULT_VOICE_RULES so downstream
 * code never encounters undefined on bannedPhrases / toneDescription / styleNotes.
 */
function toVoiceRules(raw: unknown): { bannedPhrases: string[]; toneDescription: string; styleNotes: string } {
  const base = DEFAULT_VOICE_RULES;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...base };

  const obj = raw as Record<string, unknown>;
  return {
    bannedPhrases: toStringArray(obj.bannedPhrases, base.bannedPhrases),
    toneDescription:
      typeof obj.toneDescription === "string" && obj.toneDescription.trim()
        ? obj.toneDescription
        : base.toneDescription,
    styleNotes:
      typeof obj.styleNotes === "string" && obj.styleNotes.trim()
        ? obj.styleNotes
        : base.styleNotes,
  };
}

/** Map a raw Prisma Persona row → domain Persona type.
 *
 * All JSON columns (voiceRules, pillars, antiTopics) are coerced
 * with safe defaults so the resulting Persona always satisfies the
 * VoiceRules contract expected by writer.ts, even for rows that were
 * written by an older version of the codebase.
 */
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
    voiceRules: toVoiceRules(row.voiceRules),
    pillars: toStringArray(row.pillars, DEFAULT_PILLARS),
    antiTopics: toStringArray(row.antiTopics, DEFAULT_ANTI_TOPICS),
    createdAt: row.createdAt,
  };
}

/** Map a raw Prisma Post row → domain Post type. */
function toPost(row: {
  id: string;
  agentId: string;
  topicId: string | null;
  text: string;
  rationale: string;
  sources: unknown;
  createdAt: Date;
}): Post {
  return {
    id: row.id,
    agentId: row.agentId,
    topicId: row.topicId ?? undefined,
    text: row.text,
    rationale: row.rationale,
    sources: row.sources as PostSource[],
    createdAt: row.createdAt,
  };
}

/** Map a raw Prisma Topic row → domain Topic type. */
function toTopic(row: {
  id: string;
  agentId: string;
  title: string;
  url: string;
  discoveredAt: Date;
  status: string;
  rejectReason: string | null;
}): Topic {
  return {
    id: row.id,
    agentId: row.agentId,
    title: row.title,
    url: row.url,
    discoveredAt: row.discoveredAt,
    status: row.status as Topic["status"],
    rejectReason: row.rejectReason ?? undefined,
  };
}

// --------------- Public API -----------------------------------------

/**
 * Retrieve a single Agent row by id.
 * Returns null (never throws) when the agent does not exist.
 */
export async function getAgent(agentId: string): Promise<Agent | null> {
  const row = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt,
    personaId: row.personaId,
  };
}

/**
 * Retrieve the current persona config for an agent.
 * Joins Agent → Persona via the Agent.personaId FK.
 */
export async function getPersona(agentId: string): Promise<Persona> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { persona: true },
  });
  if (!agent) throw new Error(`memory.getPersona: Agent not found: ${agentId}`);
  return toPersona(agent.persona);
}

/**
 * Retrieve the N most recent published posts for an agent.
 * Used for dedupe context passed to curator and critic.
 */
export async function getRecentPosts(
  agentId: string,
  limit = 20
): Promise<Post[]> {
  const rows = await prisma.post.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toPost);
}

/**
 * Retrieve topic URLs discovered within the past `windowHours` hours.
 * The scout uses this list to skip URLs it has already seen.
 */
export async function getRecentTopicUrls(
  agentId: string,
  windowHours = 48
): Promise<string[]> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const rows = await prisma.topic.findMany({
    where: {
      agentId,
      discoveredAt: { gte: since },
    },
    select: { url: true },
  });
  return rows.map((r) => r.url);
}

/**
 * Persist a newly discovered topic to the DB.
 * Silently returns null if the URL already exists for this agent
 * (upsert-style safety net on top of the scout's in-memory dedupe).
 */
export async function saveTopic(
  agentId: string,
  topic: Omit<Topic, "id" | "agentId" | "discoveredAt">
): Promise<Topic> {
  // Guard: never insert duplicate URLs for the same agent.
  const existing = await prisma.topic.findFirst({
    where: { agentId, url: topic.url },
  });
  if (existing) return toTopic(existing);

  const row = await prisma.topic.create({
    data: {
      agentId,
      title: topic.title,
      url: topic.url,
      status: topic.status,
      rejectReason: topic.rejectReason ?? null,
    },
  });
  return toTopic(row);
}

/**
 * Update an existing topic's status and optional reject reason.
 * Used by the curator to transition candidate → chosen / rejected.
 */
export async function updateTopicStatus(
  topicId: string,
  status: Topic["status"],
  rejectReason?: string
): Promise<void> {
  await prisma.topic.update({
    where: { id: topicId },
    data: {
      status,
      rejectReason: rejectReason ?? null,
    },
  });
}

/**
 * Retrieve the N most recently discovered topics for an agent,
 * regardless of status.  Used by the orchestrator for context.
 */
export async function getRecentTopics(
  agentId: string,
  limit = 20
): Promise<Topic[]> {
  const rows = await prisma.topic.findMany({
    where: { agentId },
    orderBy: { discoveredAt: "desc" },
    take: limit,
  });
  return rows.map(toTopic);
}

/**
 * Retrieve topics that were previously rejected within the past
 * `windowHours` hours.  The curator uses this to avoid re-scoring
 * topics that were already judged unworthy.
 */
export async function getRejectedTopics(
  agentId: string,
  windowHours = 48
): Promise<Topic[]> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const rows = await prisma.topic.findMany({
    where: {
      agentId,
      status: "rejected",
      discoveredAt: { gte: since },
    },
    orderBy: { discoveredAt: "desc" },
  });
  return rows.map(toTopic);
}

/**
 * Return true if the agent has already published a Post whose source
 * list contains `url`.  Prevents republishing the same content.
 *
 * Checks the Topic table first (O(1) index hit on url+agentId)
 * because every published topic has status="chosen".
 */
export async function hasPublishedUrl(
  agentId: string,
  url: string
): Promise<boolean> {
  const existing = await prisma.topic.findFirst({
    where: { agentId, url, status: "chosen" },
    select: { id: true },
  });
  return existing !== null;
}

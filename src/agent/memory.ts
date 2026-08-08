// ============================================================
// Memory module — pure data access layer for the agent
// ============================================================
// Queries past posts and topics for deduplication and context injection.
// This module contains NO decision logic — it only reads/writes data.
// ============================================================

import { prisma } from "@/lib/prisma";
import type { Persona, Post, PostSource, Topic } from "@/types/agent";

// --------------- Helpers ---------------------------------

/** Map a raw Prisma Persona row → domain Persona type. */
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

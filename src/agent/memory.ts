// ============================================================
// Memory module — pure data access layer for the agent
// ============================================================
// Queries past posts and topics for deduplication and context injection.
// This module contains NO decision logic — it only reads/writes data.
//
// TODO (Milestone 3 – Orchestrator): Implement all functions below.

import { prisma } from "@/lib/prisma";
import type { Persona, Post, Topic } from "@/types/agent";

/**
 * Retrieve the current persona config for an agent.
 *
 * TODO (Milestone 3): implement Prisma lookup via Agent → Persona join.
 */
export async function getPersona(agentId: string): Promise<Persona> {
  void agentId;
  throw new Error("memory.getPersona not yet implemented");
}

/**
 * Retrieve the N most recent published posts for an agent.
 * Used for dedupe context passed to curator and critic.
 *
 * TODO (Milestone 3): implement Prisma findMany with orderBy + take.
 */
export async function getRecentPosts(agentId: string, limit = 20): Promise<Post[]> {
  void agentId;
  void limit;
  throw new Error("memory.getRecentPosts not yet implemented");
}

/**
 * Retrieve recently discovered topic URLs so the scout can skip duplicates.
 *
 * TODO (Milestone 3): implement Prisma findMany filtered by agentId + discoveredAt window.
 */
export async function getRecentTopicUrls(
  agentId: string,
  windowHours = 48
): Promise<string[]> {
  void agentId;
  void windowHours;
  throw new Error("memory.getRecentTopicUrls not yet implemented");
}

/**
 * Record a discovered topic to the DB.
 *
 * TODO (Milestone 3): implement Prisma create for Topic model.
 */
export async function saveTopic(
  agentId: string,
  topic: Omit<Topic, "id" | "agentId" | "discoveredAt">
): Promise<Topic> {
  void agentId;
  void topic;
  throw new Error("memory.saveTopic not yet implemented");
}

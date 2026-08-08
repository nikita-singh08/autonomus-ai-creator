// ============================================================
// Shared TypeScript types for the autonomous agent system
// ============================================================

// --------------- Persona -----------------

export interface VoiceRules {
  bannedPhrases: string[];
  toneDescription: string;
  styleNotes: string;
}

export interface Persona {
  id: string;
  agentId: string;
  version: number;
  name: string;
  domain: string;
  voiceRules: VoiceRules;
  pillars: string[];      // topics the agent covers
  antiTopics: string[];   // topics the agent refuses
  createdAt: Date;
}

// --------------- Topic -----------------

export type TopicStatus = "candidate" | "chosen" | "rejected";

export interface Topic {
  id: string;
  agentId: string;
  title: string;
  url: string;
  discoveredAt: Date;
  status: TopicStatus;
  rejectReason?: string;
}

// --------------- Post -----------------

export interface PostSource {
  url: string;
  fetchedAt: Date;
  factsExtracted?: string[];
}

export interface Post {
  id: string;
  agentId: string;
  topicId?: string;
  text: string;
  rationale: string;
  sources: PostSource[];
  createdAt: Date;
}

// --------------- Agent -----------------

export interface Agent {
  id: string;
  createdAt: Date;
  personaId: string;  // FK to current Persona version
}

// --------------- TickLog -----------------

export type TickOutcome = "published" | "held" | "killed";

export interface TickLog {
  id: string;
  agentId: string;
  ranAt: Date;
  outcome: TickOutcome;
  detail: string;
}

// --------------- Pipeline stage I/O -----------------

/** Returned by scout.discover() */
export interface CandidateTopic {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  /** ISO publish date of the original article (used for timeliness scoring) */
  publishedAt?: Date;
}

/** Returned by curator.judge() */
export interface CuratorResult {
  chosenTopic: CandidateTopic | null;
  reasoning: string;
}

/** Single fact bound to a source URL */
export interface BoundFact {
  fact: string;
  sourceUrl: string;
}

/** Returned by researcher.gather() */
export interface ResearchResult {
  facts: BoundFact[];
  sources: PostSource[];
}

/** Returned by writer.draft() */
export interface DraftResult {
  text: string;
  rationale: string;
}

/** Returned by critic.evaluate() */
export interface CriticResult {
  pass: boolean;
  reason: string;
}

// --------------- API request/response shapes -----------------

/** POST /api/agent/init */
export interface InitPersonaInput {
  name: string;
  domain: string;
}

export interface InitAgentRequest {
  persona?: InitPersonaInput;
}

export interface InitAgentResponse {
  agentId: string;
}

/** GET /api/agent/feed */
export interface FeedPost {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: { url: string }[];
}

export interface FeedResponse {
  posts: FeedPost[];
}

/** POST /api/agent/tick */
export interface TickRequest {
  agentId: string;
}

export interface TickResponse {
  outcome: TickOutcome;
  detail: string;
}

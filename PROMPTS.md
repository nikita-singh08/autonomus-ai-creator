## Prompt 1

**Tool:** Claude

**Purpose:** Generate project architecture.

**Prompt:**
```text
You are a Staff Software Architect.
I am building a Vibe Coding Hackathon project.
Project:
Autonomous AI Creator
Requirements:
- POST /api/agent/init
- GET /api/agent/feed
The agent should:
- Discover AI topics
- Judge whether to publish
- Maintain persona
- Remember previous posts
- Publish autonomously over time
- Return rationale and sources
I am using:
- Next.js
- TypeScript
- Prisma
- Tailwind
- SQLite
IMPORTANT:
Do NOT generate code.
Only generate:
1. Complete folder structure
2. High-level architecture
3. Module responsibilities
4. Data flow
5. Database tables
6. Milestones in build order
Think like a Staff Engineer.
```

**Output Used:**
- Folder structure
- Architecture
- Database design
- Milestones

---

## Prompt 2

**Tool:** Antigravity

**Purpose:** Generate the initial project scaffold.

**Prompt:**
```text
You are a Senior Staff Full Stack Engineer.

I already have the architecture for my project.

IMPORTANT:

Do NOT redesign anything.

Follow my architecture exactly.

I will paste my architecture below.

Your task is ONLY to scaffold the project.

Requirements:

- Create the Next.js App Router project.
- Configure TypeScript.
- Configure Tailwind.
- Configure Prisma.
- Create every folder exactly as described.
- If a file is intended for a later milestone, create it with a TODO placeholder instead of implementing it.
- Create shared interfaces/types.
- Create placeholder API routes.
- Create placeholder services.
- Add TODO comments where implementation will happen.

DO NOT implement:

- RSS discovery
- Scheduler logic
- LLM integration
- Memory logic
- Editorial logic
- UI
- Business logic

Everything should compile.

The architecture below is the source of truth.

### 1. Folder Structure

```
vicodathon-abtalks/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/
│   │   │       ├── init/
│   │   │       │   └── route.ts
│   │   │       ├── feed/
│   │   │       │   └── route.ts
│   │   │       └── tick/
│   │   │           └── route.ts          # cron-triggered internal endpoint
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # optional human-facing view
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── agent/
│   │   ├── persona/
│   │   │   ├── persona.seed.ts           # Nova's identity, voice, pillars
│   │   │   └── personaStore.ts           # load/save persona version
│   │   ├── pipeline/
│   │   │   ├── scout.ts                  # topic discovery
│   │   │   ├── curator.ts                # editorial judgment / scoring
│   │   │   ├── researcher.ts             # fact extraction + source binding
│   │   │   ├── writer.ts                 # post generation
│   │   │   ├── critic.ts                 # integrity gates
│   │   │   └── publisher.ts              # commit post to DB
│   │   ├── orchestrator.ts               # runs one full tick end-to-end
│   │   └── memory.ts                     # read past posts/topics for context
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   ├── llm.ts                        # LLM API wrapper (Claude/other)
│   │   ├── rss.ts                        # feed fetching utility
│   │   ├── similarity.ts                 # TF-IDF/cosine for repetition check
│   │   └── logger.ts
│   ├── types/
│   │   └── agent.ts                      # shared TS types (Post, Topic, Persona, etc.)
│   └── config/
│       └── sources.ts                    # RSS/feed URLs per domain
├── scripts/
│   └── cron-tick.ts                      # standalone script an external scheduler calls
├── .env
├── PROMPTS.md
└── README.md
```

---

### 2. High-Level Architecture

Three logical layers:

1. **API layer** (`app/api/agent/*`) — thin, contract-only. `init` creates an agent + persona v1 row. `feed` reads and returns posts. Neither layer contains business logic — they call into the agent module.
2. **Agent pipeline layer** (`src/agent/*`) — the actual "brain." A single `orchestrator.runTick(agentId)` function runs one full cycle: Scout → Curator → Researcher → Writer → Critic → Publisher. Each stage is a pure-ish function: takes state in, returns a result, writes what it needs to persist via memory.ts.
3. **Scheduling layer** (external to Next.js request lifecycle) — since Vercel serverless functions don't run unattended, `scripts/cron-tick.ts` is a standalone script that calls `orchestrator.runTick()` directly (not via HTTP), triggered by an external scheduler (cron-job.org, Railway cron, or a GitHub Action on a schedule) hitting your deployed `/api/agent/tick`endpoint every 15–30 min. This is the highest-risk part of the system — validate it deploys and fires reliably before building pipeline depth.

---

### 3. Module Responsibilities

| ModuleResponsibilityDoes NOT do |                                                                                                             |                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `persona/persona.seed.ts`       | Static v1 definition: name, voice rules, pillars, anti-topics, banned phrases                               | Doesn't decide topics or write posts       |
| `agent/pipeline/scout.ts`       | Fetch RSS/live sources per persona's pillars, dedupe against memory, return candidate topics                | Doesn't judge or score                     |
| `agent/pipeline/curator.ts`     | Score candidates (relevance, novelty, timeliness), pick winner or return "skip this cycle", write reasoning | Doesn't fetch content or write posts       |
| `agent/pipeline/researcher.ts`  | Fetch full article text for the chosen topic, extract facts, bind each fact to its source URL               | Doesn't judge quality or write the post    |
| `agent/pipeline/writer.ts`      | Generate post text in persona voice using researched facts + rationale                                      | Doesn't decide whether to publish          |
| `agent/pipeline/critic.ts`      | Run integrity gates: quotation %, similarity vs. past posts, citation validity                              | Doesn't generate content                   |
| `agent/pipeline/publisher.ts`   | Persist the finished, passed post to DB with rationale + sources                                            | Doesn't generate or judge                  |
| `agent/orchestrator.ts`         | Sequences the pipeline stages for one tick, handles skip/kill outcomes, logs the cycle                      | Doesn't implement any stage's logic itself |
| `agent/memory.ts`               | Query past posts/topics for dedupe and context injection                                                    | Doesn't decide anything — pure data access |
| `lib/llm.ts`                    | Single wrapper for all LLM calls (used by curator, writer)                                                  | No business logic, just API call + retry   |

---

### 4. Data Flow (per tick)

```
[External scheduler] → POST /api/agent/tick
        ↓
orchestrator.runTick(agentId)
        ↓
1. memory.getPersona(agentId)        → current persona config
2. memory.getRecentPosts(agentId)    → for dedupe/context
3. scout.discover(persona)           → candidate topics[]
4. curator.judge(candidates, recentPosts, persona)
        → { chosenTopic | null, reasoning }
        → if null: log "held" cycle, END
5. researcher.gather(chosenTopic)    → { facts[], sources[] }
6. writer.draft(facts, persona)      → { text, rationale }
7. critic.evaluate(draft, recentPosts, sources)
        → { pass: bool, reason }
        → if fail: log "killed" draft, END (or retry once)
8. publisher.commit(draft, rationale, sources)
        → writes Post row
        ↓
[Next external trigger, 15-30 min later] → repeat
```

Read path (`GET /api/agent/feed`):

```
API route → prisma.post.findMany({ where: agentId, orderBy: createdAt desc })
        → map to { id, createdAt, text, rationale, sources }
        → return { posts: [...] }
```

---

### 5. Database Tables (Prisma schema, conceptual)

```
Agent
  id            String   @id
  createdAt     DateTime
  personaId     String   → FK to Persona (current version)

Persona
  id            String   @id
  agentId       String
  version       Int
  name          String
  domain        String
  voiceRules    Json      // banned phrases, tone description, style
  pillars       Json      // array of topics it covers
  antiTopics    Json      // array of topics it refuses
  createdAt     DateTime

Topic
  id            String   @id
  agentId       String
  title         String
  url           String
  discoveredAt  DateTime
  status        String   // "candidate" | "chosen" | "rejected"
  rejectReason  String?  // populated if status = rejected

Post
  id            String   @id
  agentId       String
  topicId       String?
  text          String
  rationale      String   // why selected, why relevant now
  sources       Json      // array of URLs
  createdAt     DateTime

Source
  id            String   @id
  postId        String
  url            String
  fetchedAt     DateTime
  factsExtracted Json?    // optional: raw extracted facts bound to this URL

TickLog
  id            String   @id
  agentId       String
  ranAt         DateTime
  outcome       String   // "published" | "held" | "killed"
  detail        String   // human-readable summary for debugging/demo
```

`TickLog` isn't strictly required by the API contract, but it's cheap to add and gives you visible proof of autonomous operation over 48 hours — useful for both debugging and the demo.

---

### 6. Milestones in Build Order

**Milestone 1 — Contract skeleton (target: first 2-3 hrs)**

- Prisma schema + migration
- `POST /api/agent/init` — creates Agent + Persona v1 row, returns `agentId`
- `GET /api/agent/feed` — returns seeded/mock posts in correct shape
- Deploy this immediately, verify the contract works end-to-end with fake data

**Milestone 2 — Scheduler survives unattended (target: hr 3-5, in parallel with M3)**

- Build `scripts/cron-tick.ts` as a no-op that just writes a `TickLog` row
- Wire up external scheduler (cron-job.org hitting `/api/agent/tick`, or platform-native cron)
- Confirm it fires reliably for at least 1 hour before trusting it for 48

**Milestone 3 — Pipeline stages, one at a time, testable in isolation**

- Scout (real RSS fetch + dedupe)
- Curator (scoring + explicit skip logic)
- Researcher (fact + source binding)
- Writer (persona-conditioned generation)
- Critic (integrity gates)
- Publisher (commit to DB)
- Wire all into `orchestrator.runTick`, test manually via a debug endpoint before trusting the cron

**Milestone 4 — Integration + first real autonomous run**

- Point the scheduler at the real `orchestrator.runTick`
- Let it run unattended for a few hours, inspect `TickLog` + `Post` table for sane output
- Fix voice/judgment quality issues based on real output

**Milestone 5 — Polish + demo readiness**

- Dashboard page (optional but strong for judging) showing feed + rationale + held/killed cycles
- README with route map, architecture summary
- Final PROMPTS.md pass — confirm your logged prompts match what actually got built

**Milestone 6 — Buffer (last 4-6 hrs before deadline)**

- No new features. Verify deployed feed endpoint returns real, fresh, autonomously-generated posts. Test as if you were the judge.

---

Stop after generating the scaffold.

Do not implement any business logic.

Do not continue to later milestones.

This is only Milestone 1.
```

**Output Used:**
- Next.js scaffold
- Prisma setup
- API placeholders
- Folder structure
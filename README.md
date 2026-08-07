# Autonomous AI Creator — vicodathon-abtalks

An autonomous AI agent that discovers topics, researches them, writes posts in a consistent voice, and publishes them on a schedule — unattended.

---

## Architecture

Three logical layers:

| Layer | Location | Responsibility |
|---|---|---|
| API | `src/app/api/agent/*` | Thin HTTP contract — no business logic |
| Agent pipeline | `src/agent/*` | Scout → Curator → Researcher → Writer → Critic → Publisher |
| Scheduling | External (cron-job.org / Railway / GitHub Actions) | Hits `/api/agent/tick` every 15–30 min |

---

## Route Map

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/agent/init` | Create Agent + Persona v1 row. Returns `{ agentId, personaId }` |
| `GET` | `/api/agent/feed?agentId=<id>` | Return published posts newest-first |
| `POST` | `/api/agent/tick` | Cron-triggered — runs one full pipeline cycle |

---

## Folder Structure

```
src/
├── app/
│   ├── api/agent/
│   │   ├── init/route.ts       POST — create agent + persona
│   │   ├── feed/route.ts       GET  — read posts
│   │   └── tick/route.ts       POST — cron trigger
│   ├── dashboard/page.tsx      Human-facing view (Milestone 5)
│   ├── layout.tsx
│   └── page.tsx
├── agent/
│   ├── persona/
│   │   ├── persona.seed.ts     Nova's v1 identity definition
│   │   └── personaStore.ts     DB read/write for persona versions
│   ├── pipeline/
│   │   ├── scout.ts            Topic discovery (Milestone 3)
│   │   ├── curator.ts          Editorial scoring (Milestone 3)
│   │   ├── researcher.ts       Fact extraction (Milestone 3)
│   │   ├── writer.ts           Post generation (Milestone 3)
│   │   ├── critic.ts           Integrity gates (Milestone 3)
│   │   └── publisher.ts        DB commit (Milestone 3)
│   ├── orchestrator.ts         Sequences one full tick
│   └── memory.ts               Pure data access layer
├── lib/
│   ├── prisma.ts               Prisma client singleton
│   ├── llm.ts                  LLM API wrapper (Milestone 3)
│   ├── rss.ts                  Feed fetch utility (Milestone 3)
│   ├── similarity.ts           TF-IDF cosine (Milestone 3)
│   └── logger.ts               Structured JSON logger
├── types/
│   └── agent.ts                All shared TypeScript interfaces
└── config/
    └── sources.ts              RSS feed URLs per domain pillar
scripts/
└── cron-tick.ts                Standalone script for external scheduler
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env .env.local
# Edit .env.local and set DATABASE_URL
```

### 3. Run Prisma migration

```bash
npx prisma migrate dev --name init
```

### 4. Start dev server

```bash
npm run dev
```

### 5. Create the first agent

```bash
curl -X POST http://localhost:3000/api/agent/init
# Returns: { agentId: "...", personaId: "..." }
```

### 6. Verify the feed endpoint

```bash
curl "http://localhost:3000/api/agent/feed?agentId=<id>"
```

---

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| M1 — Contract skeleton | 🚧 In progress | Prisma schema, API routes, mock responses |
| M2 — Scheduler proof-of-life | ⏳ Pending | No-op tick → TickLog row |
| M3 — Pipeline stages | ⏳ Pending | Scout → Curator → Researcher → Writer → Critic → Publisher |
| M4 — Integration run | ⏳ Pending | First unattended autonomous cycle |
| M5 — Dashboard + polish | ⏳ Pending | UI, README, PROMPTS.md |
| M6 — Buffer / demo prep | ⏳ Pending | Verify live feed before deadline |

---

## Scheduling

The `/api/agent/tick` endpoint is designed to be hit by an external scheduler:

- **cron-job.org** — free, reliable, good for rapid testing
- **Railway cron** — platform-native if deployed on Railway
- **GitHub Actions** — `schedule:` workflow trigger

Recommended interval: **every 15–30 minutes**.

See `scripts/cron-tick.ts` for the standalone script alternative.

---

## Key Design Decisions

- **Pure-ish pipeline stages** — each stage function takes state in, returns result out, no side effects except memory writes.
- **TickLog on every run** — provides 48-hour proof of autonomous operation without any UI.
- **Persona is versioned** — the Persona table supports future voice evolution without losing history.
- **Mock-first API** — all routes return correct-shaped mock data before the DB is live, so the contract is testable from Milestone 1.

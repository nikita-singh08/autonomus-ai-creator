# ⚡ Autonomous AI Creator

> An autonomous AI and technology persona that discovers, judges, researches, writes, critiques, publishes, remembers, and continues operating without additional human prompts.

---

## 🔗 Project Links

- **Live Demo:** [autonomous-ai-creator.onrender.com](https://autonomous-ai-creator.onrender.com)
- **GitHub Repository:** [nikita-singh08/autonomus-ai-creator](https://github.com/nikita-singh08/autonomus-ai-creator)
- **AI Usage Log / Prompts:** [PROMPTS.md](./PROMPTS.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Agent Instructions:** [AGENTS.md](./AGENTS.md)

---

## 💡 What Is Autonomous AI Creator?

Most AI content systems follow:

**Human → Prompt → AI → Post**

Autonomous AI Creator follows:

**Discover → Judge → Research → Write → Critique → Publish → Remember → Repeat**

After initialization, the agent operates through scheduled autonomous cycles. It discovers information from live sources, decides what is worth publishing, creates content in a consistent persona, evaluates the result, publishes selected content, and remembers previous activity.

No human prompt is required for each post.

---

## 🎯 Problem

AI-generated content is easy to produce, but most systems are still prompt-driven.

A human usually has to decide:

- What topic should be covered?
- Is it relevant?
- Is it worth publishing?
- Has it already been covered?
- What sources should be used?
- What should the AI say?

Autonomous AI Creator moves these decisions into the agent itself.

---

## 👤 Autonomous Persona

### Ada — AI Security

Ada is an AI and technology persona focused on:

- Artificial Intelligence
- Software Engineering
- Developer Tools
- Open Source
- Systems Design

### Editorial Voice

Ada's writing style is:

- Curious
- Precise
- Direct
- Evidence-oriented
- Low-hype
- Focused on concrete technical details

The system also maintains editorial rules and banned phrases to keep generated content consistent.

---

## 🧠 Autonomous Pipeline

```text
Live Sources
     ↓
Scout
     ↓
Relevance Filtering
     ↓
Curator
     ↓
Researcher
     ↓
Writer
     ↓
Critic
     ↓
Publisher
     ↓
Memory
     ↓
Next Autonomous Cycle
```

### 1. Scout

Discovers topics from live information sources such as RSS and web feeds.

Topics are filtered against the configured persona domain and pillars. Irrelevant consumer or promotional content is rejected before entering the publishing pipeline.

### 2. Curator

Evaluates candidate topics using factors such as:

- Persona relevance
- Novelty
- Timeliness
- Editorial quality

Only topics that meet the publishing criteria continue.

### 3. Researcher

Collects supporting information and source material for the selected topic.

### 4. Writer

Creates the post using Ada's configured editorial voice and writing rules.

### 5. Critic

Evaluates the generated content before publication.

Low-quality content can be rejected instead of being published.

### 6. Publisher

Publishes the final approved post to the application's feed.

### 7. Memory

Published content is stored in the database so the agent can maintain continuity and avoid unnecessary repetition.

---

## ⏱️ Autonomous Operation

The system continues operating after initialization through a scheduled GitHub Actions workflow.

```text
GitHub Actions Scheduler
          ↓
POST /api/agent/tick
          ↓
Autonomous Agent
          ↓
Discover → Judge → Research → Write → Critique → Publish
```

The scheduled workflow triggers the autonomous tick approximately once per hour.

A manual **Trigger Run** control is also available in the dashboard for testing.

---

## 🌐 API

### Initialize Agent

`POST /api/agent/init`

Example request:

```json
{
  "persona": {
    "name": "Ada",
    "domain": "AI Security"
  }
}
```

Example response:

```json
{
  "agentId": "abc-123"
}
```

### Retrieve Feed

`GET /api/agent/feed?agentId=abc-123`

Example response:

```json
{
  "posts": [
    {
      "id": "p7",
      "createdAt": "2026-08-07T10:30:00Z",
      "text": "Generated post...",
      "rationale": "Why the topic was selected and why it is relevant now.",
      "sources": [
        "https://example.com/article"
      ]
    }
  ]
}
```

The feed returns posts newest first and preserves previously published posts.

---

## 🏆 Hackathon Requirements

| Requirement | Implementation |
|---|---|
| **Topic Discovery** | Live RSS / web information sources |
| **Editorial Judgment** | Scout + Curator relevance and quality filtering |
| **Consistent Persona** | Ada — AI Security |
| **Stable Interests** | Domain, pillars, anti-topics and voice rules |
| **Memory** | Database-backed publishing history |
| **Autonomous Publishing** | Scheduled GitHub Actions + autonomous tick |
| **Publishing Rationale** | Included with every published post |
| **Source Attribution** | Source URLs included in feed posts |
| **Initialize API** | `POST /api/agent/init` |
| **Feed API** | `GET /api/agent/feed` |
| **Public Repository** | [GitHub Repository](https://github.com/nikita-singh08/autonomus-ai-creator) |
| **Live Demo** | [Render Deployment](https://autonomous-ai-creator.onrender.com) |
| **AI Usage Log** | [PROMPTS.md](./PROMPTS.md) |

---

## 🛠️ Tech Stack

- **Next.js**
- **TypeScript**
- **Prisma**
- **PostgreSQL**
- **Tailwind CSS**
- **GitHub Actions**
- **Render**
- **RSS / Web Sources**

---

## 📁 Project Structure

```text
autonomus-ai-creator/
├── .github/
│   └── workflows/
├── prisma/
├── public/
├── scripts/
├── src/
│   ├── agent/
│   │   ├── pipeline/
│   │   ├── persona/
│   │   ├── orchestrator/
│   │   └── ...
│   ├── app/
│   │   └── api/
│   └── ...
├── AGENTS.md
├── ARCHITECTURE.md
├── PROMPTS.md
├── README.md
├── package.json
└── ...
```

---

## 🚀 Running Locally

### 1. Clone the Repository

[**GitHub Repository — autonomus-ai-creator**](https://github.com/nikita-singh08/autonomus-ai-creator)

```bash
git clone https://github.com/nikita-singh08/autonomus-ai-creator.git
```

Then move into the project directory:

```bash
cd autonomus-ai-creator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and add the required database and application environment variables.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start the Development Server

```bash
npm run dev
```

Open the application at:

[**http://localhost:3000**](http://localhost:3000)

### 6. Build for Production

```bash
npm run build
```

---

## 📊 Dashboard

The application includes a dashboard for observing the autonomous system.

### Dashboard

Shows:

- Agent status
- Published posts
- Success rate
- Last run
- Topics discovered
- Pipeline status

### Topics

Shows discovered topics and their status:

- Candidate
- Chosen
- Rejected

### Activity

Shows autonomous execution history and outcomes.

### Persona

Shows the active persona configuration.

### Settings

Provides application configuration and controls.

---

## 🧠 Autonomy & Memory

The agent does not require a new user prompt for every publishing cycle.

Its state and publishing history are persisted in the database.

This allows the system to:

- Remember previous publications
- Avoid unnecessary repetition
- Continue operating across scheduled cycles
- Preserve the agent's persona configuration

---

## 🤖 AI-Assisted Development

This project was developed using AI-assisted coding and agentic development workflows.

The complete AI usage history and development prompts are available in:

**[PROMPTS.md — AI Usage Log](./PROMPTS.md)**

Additional documentation:

- [ARCHITECTURE.md — System Architecture](./ARCHITECTURE.md)
- [AGENTS.md — Agent Development Instructions](./AGENTS.md)

---

## 🎯 Why This Project?

Autonomous AI Creator explores a different model of AI content generation.

Instead of:

```text
Prompt → Generate
```

the goal is:

```text
Observe
   ↓
Decide
   ↓
Research
   ↓
Create
   ↓
Evaluate
   ↓
Publish
   ↓
Remember
   ↓
Repeat
```

The important capability is not simply generating text.

It is giving an AI persona the ability to **decide what is worth saying, explain why, remember what it has already done, and continue making those decisions over time.**

---

## 📜 License

This project was created as a hackathon submission.

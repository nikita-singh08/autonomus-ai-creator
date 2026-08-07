# Autonomous AI Creator — Prompts Log

This file logs the key prompts used at each pipeline stage.
Update this as you build out each milestone.

---

## Curator — topic scoring prompt

TODO (Milestone 3): Document the system + user prompt used to score and
select candidate topics. Include:
- The system prompt (persona voice, pillar alignment)
- The user prompt template (candidate topic list + recent post summaries)
- The expected output format (JSON with { chosenTopic, reasoning })

```
[PROMPT WILL GO HERE]
```

---

## Writer — post generation prompt

TODO (Milestone 3): Document the system + user prompt used to generate
posts. Include:
- System prompt (voice rules, banned phrases, tone, style)
- User prompt (researched facts with source URLs)
- Expected output format ({ text, rationale })

```
[PROMPT WILL GO HERE]
```

---

## Researcher — fact extraction prompt

TODO (Milestone 3): Document the prompt used to extract atomic facts
from article body text, bound to source URLs.

```
[PROMPT WILL GO HERE]
```

---

## Critic — integrity review prompt (if LLM-assisted)

TODO (Milestone 3): If any critic gate uses an LLM call (e.g. plagiarism
assessment), document the prompt here.

```
[PROMPT WILL GO HERE]
```

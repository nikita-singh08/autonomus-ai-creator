// ============================================================
// Writer — post generation stage
// ============================================================
// Generates the post text in the persona's editorial voice using
// researched facts, and writes a rationale string explaining why
// the topic was chosen and why it matters right now.
//
// Does NOT decide whether to publish — that is the critic's job.
// ============================================================

import { callLLM } from "@/lib/llm";
import { logger } from "@/lib/logger";
import type { CandidateTopic, DraftResult, Persona, ResearchResult } from "@/types/agent";

// --------------- Constants --------------------------------

/** Hard word-count ceiling for the generated post. */
const MAX_WORDS = 300;

/** Soft word-count floor — posts shorter than this are suspicious. */
const MIN_WORDS = 80;

// --------------- Input validation -------------------------

/**
 * Validated, normalised view of the research object.
 * All array fields are guaranteed to be real arrays here.
 */
interface ValidatedResearch {
  /** BoundFact[] — at least 1 element guaranteed. */
  facts: Array<{ fact: string; sourceUrl: string }>;
  /** PostSource[] — at least 1 element guaranteed. */
  sources: Array<{ url: string; fetchedAt: Date; factsExtracted?: string[] }>;
  /** string[] — may be empty but never undefined. */
  keyPoints: string[];
  /** Non-empty summary string. */
  summary: string;
}

/**
 * Validate the object returned by researcher.gather() before any .map() call.
 *
 * Throws a descriptive error that names the exact missing or malformed field
 * so the error is actionable — not a cryptic "Cannot read properties of undefined".
 *
 * The schema it validates against matches researcher.gather()'s documented
 * return type: ResearchResult & { summary: string; keyPoints: string[] }
 */
function validateResearch(
  raw: ResearchResult & { summary?: string; keyPoints?: string[] }
): ValidatedResearch {
  // ── facts ─────────────────────────────────────────────────
  if (!Array.isArray(raw.facts)) {
    throw new Error(
      `writer: research.facts is ${
        raw.facts === undefined ? "undefined" : `type "${typeof raw.facts}"`
      }. ` +
        "Researcher must return { facts: BoundFact[], ... }. " +
        "Check that researcher.gather() returns the facts array in its return object."
    );
  }

  // ── sources ───────────────────────────────────────────────
  if (!Array.isArray(raw.sources)) {
    throw new Error(
      `writer: research.sources is ${
        raw.sources === undefined ? "undefined" : `type "${typeof raw.sources}"`
      }. ` +
        "Researcher must return { sources: PostSource[], ... }. " +
        "Check that researcher.gather() returns the sources array in its return object."
    );
  }

  if (raw.sources.length === 0) {
    throw new Error(
      "writer: research.sources is an empty array. " +
        "Researcher must include at least one PostSource entry."
    );
  }

  // ── keyPoints ─────────────────────────────────────────────
  // keyPoints is an extension field — Researcher adds it beyond ResearchResult.
  // Normalise to [] if absent rather than throwing, because it's display-only.
  const keyPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints : [];

  // ── summary ───────────────────────────────────────────────
  const summary =
    typeof raw.summary === "string" && raw.summary.trim().length > 0
      ? raw.summary
      : raw.facts.length > 0
      ? raw.facts[0].fact
      : "No summary available.";

  return {
    facts: raw.facts,
    sources: raw.sources,
    keyPoints,
    summary,
  };
}

/**
 * Validate the persona object before any .map()/.join() call on its fields.
 *
 * Persona fields arrive from Prisma as JSON cast with `as` — no runtime
 * guarantee that the nested arrays exist.  This function throws a descriptive
 * error early rather than letting a `.map()` crash with a cryptic message.
 */
function validatePersona(persona: Persona): void {
  if (!persona || typeof persona !== "object") {
    throw new Error("writer: persona is undefined or not an object.");
  }

  if (!persona.voiceRules || typeof persona.voiceRules !== "object") {
    throw new Error(
      "writer: persona.voiceRules is missing. " +
        "The Persona row in the database must have a voiceRules JSON field."
    );
  }

  if (!Array.isArray(persona.voiceRules.bannedPhrases)) {
    throw new Error(
      `writer: persona.voiceRules.bannedPhrases is ${
        persona.voiceRules.bannedPhrases === undefined
          ? "undefined"
          : `type "${typeof persona.voiceRules.bannedPhrases}"`
      }. ` +
        "Expected string[]. Check the voiceRules JSON stored in the Persona DB row."
    );
  }

  if (!Array.isArray(persona.pillars)) {
    throw new Error(
      `writer: persona.pillars is ${
        persona.pillars === undefined ? "undefined" : `type "${typeof persona.pillars}"`
      }. ` +
        "Expected string[]. Check the pillars JSON stored in the Persona DB row."
    );
  }

  if (!Array.isArray(persona.antiTopics)) {
    throw new Error(
      `writer: persona.antiTopics is ${
        persona.antiTopics === undefined
          ? "undefined"
          : `type "${typeof persona.antiTopics}"`
      }. ` +
        "Expected string[]. Check the antiTopics JSON stored in the Persona DB row."
    );
  }
}

// --------------- Prompt builders -------------------------

/**
 * Build the system prompt that conditions the LLM on the persona's voice.
 *
 * Precondition: validatePersona(persona) must have been called first.
 * All .map() and .join() calls here operate on validated arrays.
 */
function buildSystemPrompt(persona: Persona): string {
  // bannedPhrases, pillars, antiTopics are validated arrays at this point.
  const banned = persona.voiceRules.bannedPhrases
    .map((p) => `"${p}"`)
    .join(", ");

  return `You are ${persona.name}, an expert AI/technology writer.

VOICE AND TONE:
${persona.voiceRules.toneDescription}

STYLE NOTES:
${persona.voiceRules.styleNotes}

BANNED PHRASES (never use these):
${banned}

TOPIC PILLARS YOU COVER:
${persona.pillars.join(", ")}

TOPICS YOU REFUSE:
${persona.antiTopics.join(", ")}

RULES:
- Write in your own expert voice. Never sound like marketing copy.
- Keep the post under ${MAX_WORDS} words total.
- Open with a strong, specific first sentence — no "In this post..." or generic intros.
- Include concrete facts, numbers, or technical specifics from the research.
- Cite sources inline where relevant (e.g., "According to [Source], ...").
- Avoid buzzwords like: ${banned}
- Short paragraphs only (2–3 sentences max each).
- No headers, no bullet points — flowing prose only.
- End with a sharp, insightful closing thought that gives readers something to act on or think about.`;
}

/**
 * Build the user prompt from the research facts and chosen topic.
 *
 * Precondition: validateResearch(research) has already been called and
 * returned a ValidatedResearch.  All .map()/.join() calls operate on
 * guaranteed non-undefined arrays.
 */
function buildUserPrompt(
  topic: CandidateTopic & { publishedAt?: Date; source?: string },
  research: ValidatedResearch
): string {
  // facts and keyPoints are guaranteed arrays from ValidatedResearch.
  const factLines = research.facts
    .slice(0, 8)
    .map((f, i) => `${i + 1}. ${f.fact} [source: ${f.sourceUrl}]`)
    .join("\n");

  const keyPointsText =
    research.keyPoints.length > 0
      ? research.keyPoints.slice(0, 5).join("\n- ")
      : "";

  const sourceLabel = topic.source ? ` (via ${topic.source})` : "";
  const pubDate = topic.publishedAt
    ? ` published ${topic.publishedAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : "";

  return `TOPIC: "${topic.title}"${sourceLabel}${pubDate}

RESEARCH FACTS:
${factLines || "(No facts extracted — write from the topic title and URL.)"}

${keyPointsText ? `KEY POINTS:\n- ${keyPointsText}\n\n` : ""}SOURCE URL: ${topic.url}

TASK:
Write a single, flowing post of ${MIN_WORDS}–${MAX_WORDS} words on this topic.

After the post, on a new line write:
RATIONALE: [2–3 sentences explaining: (1) why this topic was selected, (2) why it matters right now, and (3) why readers should care]

Format your entire response as:
[post text here]

RATIONALE: [rationale here]`;
}

// --------------- Response parser -------------------------

/**
 * Parse the LLM response into { text, rationale }.
 * Splits on the "RATIONALE:" marker. Falls back gracefully if the
 * LLM deviates from the format.
 */
function parseResponse(raw: string, topic: CandidateTopic): DraftResult {
  const RATIONALE_MARKER = /\nRATIONALE:\s*/i;
  const parts = raw.split(RATIONALE_MARKER);

  let text = parts[0]?.trim() ?? "";
  let rationale = parts[1]?.trim() ?? "";

  // Fallback: if no marker found, use the whole response as text.
  if (!rationale) {
    rationale =
      `This topic was selected because it covers "${topic.title}" — ` +
      `a development relevant to the core pillars of AI and technology covered by ` +
      `this publication. It is timely, substantive, and offers readers practical ` +
      `insight into ongoing developments in the field.`;
  }

  // Enforce word count ceiling post-hoc by truncating at sentence boundary.
  const words = text.split(/\s+/);
  if (words.length > MAX_WORDS) {
    const truncated = words.slice(0, MAX_WORDS).join(" ");
    const lastPeriod = Math.max(
      truncated.lastIndexOf(". "),
      truncated.lastIndexOf("! "),
      truncated.lastIndexOf("? ")
    );
    text = lastPeriod > 0 ? truncated.slice(0, lastPeriod + 1) : truncated;
  }

  return { text, rationale };
}

/**
 * Scan the generated text for banned phrases and return any found.
 * bannedPhrases is guaranteed to be a string[] by validatePersona().
 */
function findBannedPhrases(text: string, bannedPhrases: string[]): string[] {
  const lower = text.toLowerCase();
  return bannedPhrases.filter((p) => lower.includes(p.toLowerCase()));
}

// --------------- Public API ------------------------------

/**
 * Draft a post from researched facts in the persona's editorial voice.
 *
 * Input contract (matches researcher.gather() return shape exactly):
 *   research.facts     — BoundFact[]   — required, ≥ 1 element
 *   research.sources   — PostSource[]  — required, ≥ 1 element
 *   research.keyPoints — string[]      — optional extension, may be empty
 *   research.summary   — string        — optional extension
 *
 * Steps:
 *   1. Validate research and persona inputs — throws descriptive errors if malformed
 *   2. Build system prompt from persona voice rules
 *   3. Build user prompt from research facts + topic metadata
 *   4. Call LLM
 *   5. Parse response into { text, rationale }
 *   6. Check for banned phrases — if found, attempt one rewrite pass
 *   7. Return DraftResult
 *
 * @param research - Facts + sources from researcher.gather()
 * @param persona  - Persona config for voice conditioning
 * @param topic    - The chosen topic (for metadata in the prompt)
 */
export async function draft(
  research: ResearchResult & { summary?: string; keyPoints?: string[] },
  persona: Persona,
  topic: CandidateTopic & { publishedAt?: Date; source?: string }
): Promise<DraftResult> {
  // ── Input validation (throws descriptive errors before any .map()/.join()) ──
  validatePersona(persona);
  const validResearch = validateResearch(research);

  logger.info("writer: Writer Started", {
    topicTitle: topic.title,
    topicUrl: topic.url,
    factCount: validResearch.facts.length,
    sourceCount: validResearch.sources.length,
    keyPointCount: validResearch.keyPoints.length,
  });

  const systemPrompt = buildSystemPrompt(persona);
  const userPrompt = buildUserPrompt(topic, validResearch);

  // ── First generation pass ─────────────────────────────────
  let raw = await callLLM(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 600, temperature: 0.7 }
  );

  let result = parseResponse(raw.text, topic);

  // ── Banned phrase check + single rewrite pass ─────────────
  // persona.voiceRules.bannedPhrases is validated array at this point.
  const banned = findBannedPhrases(result.text, persona.voiceRules.bannedPhrases);
  if (banned.length > 0) {
    logger.warn("writer: banned phrases detected — requesting rewrite", {
      banned,
      topicUrl: topic.url,
    });

    const rewritePrompt =
      `Your previous draft contained banned phrases: ${banned
        .map((p) => `"${p}"`)
        .join(", ")}.\n\n` +
      `Rewrite the post removing all instances of these phrases while preserving ` +
      `the factual content and your voice.\n\n` +
      `Previous draft:\n${result.text}\n\n` +
      `Rewritten post (${MIN_WORDS}–${MAX_WORDS} words, no banned phrases):`;

    raw = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        { role: "assistant", content: raw.text },
        { role: "user", content: rewritePrompt },
      ],
      { maxTokens: 600, temperature: 0.5 }
    );

    result = parseResponse(raw.text, topic);
  }

  logger.info("writer: Writer Finished", {
    topicUrl: topic.url,
    wordCount: result.text.split(/\s+/).length,
    hasRationale: result.rationale.length > 0,
  });

  return result;
}

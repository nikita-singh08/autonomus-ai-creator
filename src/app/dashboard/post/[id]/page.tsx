import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

// ============================================================
// Post Detail — /dashboard/post/[id]
// ============================================================

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      topic: true,
      srcs:  true,
      agent: {
        select: {
          id: true,
          persona: { select: { name: true, domain: true, version: true } },
        },
      },
    },
  });

  if (!post) notFound();

  type RawSource = { url?: string; fetchedAt?: string };

  function parseSourceUrls(raw: unknown): string[] {
    if (!raw) return [];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) {
        return (arr as (RawSource | string)[])
          .map((s) => (typeof s === "string" ? s : (s as RawSource).url ?? ""))
          .filter(Boolean);
      }
    } catch {}
    return [];
  }

  function parseFacts(raw: unknown): string[] {
    if (!raw) return [];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch { return []; }
  }

  const sourceUrls = parseSourceUrls(post.sources);

  // Gather facts from all Source records
  const allFacts = post.srcs.flatMap((s) => parseFacts(s.factsExtracted));

  function cleanCSS(text: string) {
    if (!text) return "";
    let cleaned = text.replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, "");
    cleaned = cleaned.replace(/\/\*!sc\*\//g, "");
    cleaned = cleaned.replace(/^[a-z-]+:\s*[^;]+;/gm, "");
    return cleaned.trim();
  }

  return (
    <>
      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard/content">
          <button className="btn btn-ghost btn-sm">← Back to Feed</button>
        </Link>
      </div>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <h1 className="page-title" style={{ fontSize: 24 }}>
          Post Detail
        </h1>
        <span className="badge badge-published" style={{ flexShrink: 0, marginTop: 4 }}>Published</span>
      </div>

      {/* Two-column layout */}
      <div className="layout-post-detail">
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Generated Content */}
          <div className="card card-lg">
            <div className="section-heading">
              <span>📄</span> Generated Content
            </div>
            <div style={{ fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {cleanCSS(post.text)}
            </div>
          </div>

          {/* Rationale + Topic */}
          <div className="grid-2" style={{ gap: 18 }}>
            <div className="card">
              <div className="section-heading" style={{ marginBottom: 12 }}>
                <span>💡</span> Agent Rationale
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {cleanCSS(post.rationale) || "No rationale provided."}
              </p>
            </div>
            {post.topic && (
              <div className="card">
                <div className="section-heading" style={{ marginBottom: 12 }}>
                  <span>🔭</span> Selected Topic
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  {post.topic.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ color: "var(--cyan)", fontSize: 12 }}>🔗</span>
                  <a
                    href={post.topic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "var(--cyan-text)", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {post.topic.url}
                  </a>
                </div>
                <span className={`badge badge-${post.topic.status}`} style={{ fontSize: 11 }}>
                  {post.topic.status}
                </span>
              </div>
            )}
          </div>

          {/* Extracted Facts */}
          {allFacts.length > 0 && (
            <div className="card">
              <div className="section-heading">
                <span>🧪</span> Extracted Facts
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allFacts.map((fact, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--status-published)", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cleanCSS(fact)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference URLs */}
          {sourceUrls.length > 0 && (
            <div className="card">
              <div className="section-heading">
                <span>🔗</span> Reference URLs
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sourceUrls.map((url, i) => (
                  <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {url}
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "var(--cyan-text)", fontFamily: "var(--font-mono)", textDecoration: "underline" }}
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — execution metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="stat-label" style={{ marginBottom: 14 }}>Execution Metadata</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="field-label">Timestamp</div>
                <div className="field-value-mono" style={{ fontSize: 12 }}>
                  {new Date(post.createdAt).toISOString().replace("T", " ").slice(0, 19)} UTC
                </div>
              </div>
              <div>
                <div className="field-label">Agent Identity</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "var(--primary-dim)", border: "1.5px solid var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--primary-text)",
                  }}>
                    {post.agent.persona?.name?.slice(0, 2).toUpperCase() ?? "AG"}
                  </div>
                  <div className="field-value" style={{ fontSize: 13 }}>
                    {post.agent.persona?.name ?? "Agent"} (v{post.agent.persona?.version ?? 1})
                  </div>
                </div>
              </div>
              <div>
                <div className="field-label">Model Engine</div>
                <div className="field-value" style={{ fontSize: 13 }}>Groq LLM</div>
              </div>
              <div>
                <div className="field-label">Post ID</div>
                <div className="field-value-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {post.id}
                </div>
              </div>
            </div>
          </div>

          {/* Source count card */}
          <div className="card">
            <div className="stat-label" style={{ marginBottom: 10 }}>Source Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>Reference URLs</span>
                <span style={{ fontWeight: 600 }}>{sourceUrls.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-secondary)" }}>Extracted Facts</span>
                <span style={{ fontWeight: 600 }}>{allFacts.length}</span>
              </div>
            </div>
          </div>

          <Link href="/dashboard/activity">
            <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>
              🕐 View Full Logs
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}

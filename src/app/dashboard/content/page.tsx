import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";

// ============================================================
// Generated Content Feed — /dashboard/content
// ============================================================

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, persona: { select: { name: true } } },
  });

  const posts = agent
    ? await prisma.post.findMany({
        where: { agentId: agent.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          topic: { select: { title: true, url: true } },
          srcs:  { select: { url: true } },
        },
      })
    : [];

  function relativeTime(d: Date) {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60)    return `${Math.round(diff)}s ago`;
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  }

  type RawSource = { url?: string } | string;

  function parseSourceUrls(raw: unknown): string[] {
    if (!raw) return [];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) {
        return (arr as RawSource[])
          .map((s) => (typeof s === "string" ? s : (s as { url?: string }).url ?? ""))
          .filter(Boolean);
      }
    } catch {}
    return [];
  }

  function hostOf(url: string) {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
  }

  function cleanCSS(text: string) {
    if (!text) return "";
    let cleaned = text.replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, "");
    cleaned = cleaned.replace(/\/\*!sc\*\//g, "");
    cleaned = cleaned.replace(/^[a-z-]+:\s*[^;]+;/gm, "");
    return cleaned.trim();
  }

  const agentInitials = agent?.persona?.name
    ? agent.persona.name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "AG";

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Generated Feed</h1>
          <p className="page-subtitle">
            Content synthesized and vetted by{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {agent?.persona?.name ?? "the agent"}
            </strong>{" "}
            across selected topics and data sources.
          </p>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 16, paddingTop: 6, whiteSpace: "nowrap" }}>
          {posts.length} post{posts.length !== 1 ? "s" : ""} total
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No posts yet</div>
          <div className="empty-desc">
            Click <strong>Trigger Run</strong> in the top bar to run the autonomous pipeline and generate your first post.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {posts.map((post) => {
            const sources = parseSourceUrls(post.sources);

            return (
              <div key={post.id} className="card card-lg">
                {/* Top bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "var(--primary-dim)", border: "2px solid var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "var(--primary-text)",
                    }}>{agentInitials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{agent?.persona?.name ?? "Agent"}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{relativeTime(post.createdAt)}</div>
                    </div>
                  </div>
                  {post.topic && (
                    <span className="badge badge-candidate" style={{ fontSize: 10, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {post.topic.title.slice(0, 30)}{post.topic.title.length > 30 ? "…" : ""}
                    </span>
                  )}
                </div>

                {/* Post text */}
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 16 }}>
                  {cleanCSS(post.text)}
                </div>

                {/* Rationale + Sources grid */}
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 13 }}>💡</span>
                      <span className="stat-label" style={{ marginBottom: 0 }}>Rationale</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                      {cleanCSS(post.rationale) || "No rationale provided."}
                    </p>
                  </div>
                  <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 13 }}>🔗</span>
                      <span className="stat-label" style={{ marginBottom: 0 }}>Synthesized Sources</span>
                    </div>
                    {sources.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {sources.slice(0, 4).map((url, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--cyan)", fontSize: 11, flexShrink: 0 }}>↗</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "var(--cyan-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}
                            >
                              {hostOf(url)}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No sources recorded</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <Link href={`/dashboard/post/${post.id}`}>
                    <button className="btn btn-sm btn-outline">👁 View Details</button>
                  </Link>
                  <CopyButton text={post.text} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

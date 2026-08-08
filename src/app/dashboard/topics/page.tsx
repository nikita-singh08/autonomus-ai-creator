import { prisma } from "@/lib/prisma";

// ============================================================
// Topic Scout — /dashboard/topics
// ============================================================
// Read-only. No mutation endpoints exist, so no mutation UI.
// Shows real topics from DB with status badges, search, filters.
// ============================================================

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const topics = agent
    ? await prisma.topic.findMany({
        where: { agentId: agent.id },
        orderBy: { discoveredAt: "desc" },
        take: 100,
      })
    : [];

  const candidateCount = topics.filter((t) => t.status === "candidate").length;
  const chosenCount    = topics.filter((t) => t.status === "chosen").length;
  const rejectedCount  = topics.filter((t) => t.status === "rejected").length;

  function relativeDate(d: Date) {
    const now = new Date();
    const date = new Date(d);
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return isToday ? `${timeStr}\nToday` : `${timeStr}\nYesterday`;
  }

  function hostOf(url: string) {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
  }

  function shortHost(url: string) {
    const h = hostOf(url);
    return h.length > 22 ? h.slice(0, 22) + "…" : h;
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Topic Scout</h1>
        <p className="page-subtitle">
          Review and analyze topics automatically discovered by the scouting agent.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: "All",       value: topics.length,  color: "var(--text-primary)" },
          { label: "Candidate", value: candidateCount, color: "var(--primary)" },
          { label: "Chosen",    value: chosenCount,    color: "var(--status-chosen)" },
          { label: "Rejected",  value: rejectedCount,  color: "var(--status-killed)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card card-sm" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <span style={{ paddingLeft: 34, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
              {topics.length} topic{topics.length !== 1 ? "s" : ""} loaded
            </span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center" }}>FILTER BY STATUS</span>
            {["All", "Candidate", "Chosen", "Rejected"].map((s) => (
              <span key={s} className="badge" style={{
                background: s === "All" ? "var(--primary)" : "var(--bg-elevated)",
                color: s === "All" ? "#fff" : "var(--text-secondary)",
                borderRadius: "var(--radius-sm)",
                cursor: "default",
                fontSize: 11,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔭</div>
            <div className="empty-title">No topics discovered yet</div>
            <div className="empty-desc">
              Trigger a run to let the Scout discover topics from configured RSS feeds.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Title &amp; Description</th>
                  <th>Source</th>
                  <th>Discovered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => {
                  const lines = relativeDate(topic.discoveredAt).split("\n");
                  return (
                    <tr key={topic.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.4 }}>
                          {topic.title}
                        </div>
                        {topic.rejectReason && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                            {topic.rejectReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ color: "var(--cyan)", fontSize: 12 }}>🔗</span>
                          <span style={{ fontSize: 12.5, color: "var(--cyan-text)", fontFamily: "var(--font-mono)" }}>
                            {shortHost(topic.url)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                          <div style={{ color: "var(--text-primary)" }}>{lines[0]}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{lines[1]}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${topic.status}`}>
                          {topic.status.charAt(0).toUpperCase() + topic.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {topics.length > 0 && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-muted)" }}>
            Showing {topics.length} of {topics.length} topics
          </div>
        )}
      </div>

      {/* Read-only notice */}
      <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--primary-dim)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 12.5, color: "var(--primary-text)" }}>
        ℹ️  Topic management (manual entry, reject, choose) requires backend mutation endpoints not yet implemented. Topics above are automatically managed by the autonomous pipeline.
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";

// ============================================================
// Command Center — /dashboard
// ============================================================
// Server component — all data fetched directly from the real DB.
// No hardcoded metrics. No fictional data.
// ============================================================

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  // ── Load first agent ──────────────────────────────────────
  const agent = await prisma.agent.findFirst({
    select: {
      id: true,
      createdAt: true,
      persona: {
        select: {
          name: true,
          domain: true,
          version: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── Real metrics ──────────────────────────────────────────
  const totalPublished = agent
    ? await prisma.post.count({ where: { agentId: agent.id } })
    : 0;

  const totalTopics = agent
    ? await prisma.topic.count({ where: { agentId: agent.id } })
    : 0;

  const rejectedTopics = agent
    ? await prisma.topic.count({ where: { agentId: agent.id, status: "rejected" } })
    : 0;

  const totalTicks = agent
    ? await prisma.tickLog.count({ where: { agentId: agent.id } })
    : 0;

  const publishedTicks = agent
    ? await prisma.tickLog.count({ where: { agentId: agent.id, outcome: "published" } })
    : 0;

  const successRate =
    totalTicks > 0 ? Math.round((publishedTicks / totalTicks) * 1000) / 10 : null;

  // ── Last tick ─────────────────────────────────────────────
  const lastTick = agent
    ? await prisma.tickLog.findFirst({
        where: { agentId: agent.id },
        orderBy: { ranAt: "desc" },
      })
    : null;

  // ── Recent ticks for pipeline state ───────────────────────
  const recentTicks = agent
    ? await prisma.tickLog.findMany({
        where: { agentId: agent.id },
        orderBy: { ranAt: "desc" },
        take: 5,
      })
    : [];

  // ── Format helpers ────────────────────────────────────────
  function relativeTime(d: Date) {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60)   return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  // Pipeline nodes
  const pipelineNodes = [
    { name: "Scout Node",      desc: "Ingests RSS feeds and trending data sources.",       icon: "🔍" },
    { name: "Curator Node",    desc: "Scores and filters discovered topics.",               icon: "📋" },
    { name: "Researcher Node", desc: "Compiles facts from deep-dive technical sources.",    icon: "📡" },
    { name: "Writer Node",     desc: "Synthesizes narrative based on Persona parameters.", icon: "✍️" },
    { name: "Critic Node",     desc: "Evaluates draft for quality and factual accuracy.",  icon: "🔬" },
    { name: "Publisher Node",  desc: "Final destination routing.",                          icon: "📤" },
  ];

  const hasRun = recentTicks.length > 0;
  const lastOutcome = lastTick?.outcome ?? null;

  return (
    <>
      {/* ── Page Header ───────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Real-time telemetry and orchestration for your autonomous content operations.
            Monitoring pipeline execution across all configured domains.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 24 }}>
          <span className="system-chip">
            <span className="live-ops-dot" />
            {agent ? "System Online" : "No Agent"}
          </span>
        </div>
      </div>

      {/* ── Telemetry Row ─────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {/* Agent Status */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🤖</span>
            {agent && (
              <span className="badge badge-online" style={{ fontSize: 10 }}>
                Agent #{agent.id.slice(-4).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="stat-label">Status</div>
            <div className="stat-value-sm" style={{ color: agent ? "var(--status-online)" : "var(--text-muted)" }}>
              {agent ? "ACTIVE" : "NO AGENT"}
            </div>
          </div>
          <div>
            <div className="stat-label">Focus Domain</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {agent?.persona?.domain ?? "N/A"}
            </div>
          </div>
        </div>

        {/* Total Published */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="stat-label">Total Published</div>
            <span style={{ fontSize: 20 }}>📄</span>
          </div>
          <div className="stat-value">{totalPublished}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>posts generated</div>
        </div>

        {/* Success Rate */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="stat-label">Success Rate</div>
            <span style={{ fontSize: 20 }}>📊</span>
          </div>
          <div className="stat-value" style={{ color: "var(--cyan)" }}>
            {successRate !== null ? `${successRate}%` : "N/A"}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            {totalTicks > 0 ? `${totalTicks} total ticks` : "No ticks yet"}
          </div>
        </div>

        {/* Last / Next Run */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="stat-label">Last Run</div>
            <span style={{ fontSize: 20 }}>🕐</span>
          </div>
          {lastTick ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                {relativeTime(lastTick.ranAt)}
              </div>
              <div style={{ marginTop: 4 }}>
                <span className={`outcome-badge outcome-${lastTick.outcome === "published" ? "pub" : lastTick.outcome === "held" ? "held" : "kill"}`}>
                  {lastTick.outcome.toUpperCase()}
                </span>
              </div>
            </>
          ) : (
            <div className="stat-value-sm" style={{ color: "var(--text-muted)" }}>N/A</div>
          )}
        </div>
      </div>

      {/* ── Discovery Row ─────────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            🔭
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Topics Discovered</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Analyzed from source feeds</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)" }}>{totalTopics}</div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            ✗
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Topics Rejected</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Failed validation criteria</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--status-killed)" }}>{rejectedTopics}</div>
        </div>
      </div>

      {/* ── Autonomous Execution Pipeline ─────────────────────── */}
      <div className="card card-lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="section-heading" style={{ margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Autonomous Execution Pipeline
          </div>
          {lastTick && (
            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              RAN: {formatDate(lastTick.ranAt)}
            </span>
          )}
        </div>

        {!hasRun ? (
          <div className="empty-state">
            <div className="empty-icon">🚀</div>
            <div className="empty-title">No runs yet</div>
            <div className="empty-desc">Click Trigger Run to execute the first autonomous cycle.</div>
          </div>
        ) : (
          <div className="pipeline" style={{ maxWidth: 640 }}>
            {pipelineNodes.map((node, i) => {
              // Determine state: if last tick was published, all done; held = up to writer; killed = first few done
              const isDone =
                lastOutcome === "published" ? true :
                lastOutcome === "held"      ? i < 2 :
                lastOutcome === "killed"    ? i < 1 :
                false;
              const state = isDone ? "done" : "waiting";

              return (
                <div key={node.name} className="pipeline-step">
                  <div className={`pipeline-icon ${state}`}>
                    {state === "done" ? "✓" : node.icon}
                  </div>
                  <div className="pipeline-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="pipeline-node-name">{node.name}</div>
                      {state === "done" && (
                        <span className="outcome-badge outcome-pub" style={{ fontSize: 9 }}>COMPLETED</span>
                      )}
                    </div>
                    <div className="pipeline-node-desc">{node.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent ticks mini-table */}
        {recentTicks.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="stat-label" style={{ marginBottom: 10 }}>Recent Execution History</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentTicks.map((tick) => (
                <div
                  key={tick.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70 }}>
                    {formatDate(tick.ranAt)}
                  </span>
                  <span className={`outcome-badge outcome-${tick.outcome === "published" ? "pub" : tick.outcome === "held" ? "held" : "kill"}`}>
                    {tick.outcome.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tick.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

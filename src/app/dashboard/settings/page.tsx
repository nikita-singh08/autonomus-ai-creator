import { prisma } from "@/lib/prisma";

// ============================================================
// Settings / Configuration — /dashboard/settings
// ============================================================
// Visual-only settings display. No mutation APIs exist for most
// controls. Read-only where not supported. No secrets exposed.
// ============================================================

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      persona: {
        select: { name: true, domain: true, version: true },
      },
    },
  });

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Configuration</h1>
        <p className="page-subtitle">
          Operational parameters and core identity of your autonomous agent.
          Changes to the pipeline require backend configuration.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Row 1: Agent Identity + LLM Providers */}
        <div className="grid-2" style={{ gap: 20 }}>
          {/* Agent Identity */}
          <div className="card card-lg">
            <div className="section-heading">
              <span>🤖</span> Agent Identity
              {agent && (
                <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
                  ID: {agent.id.slice(-8).toUpperCase()}
                </span>
              )}
            </div>

            {agent ? (
              <>
                <div className="grid-2" style={{ gap: 14, marginBottom: 16 }}>
                  <div>
                    <label className="field-label">Designation</label>
                    <input
                      className="field-input"
                      value={agent.persona?.name ?? ""}
                      readOnly
                      title="Read-only — edit via API"
                    />
                  </div>
                  <div>
                    <label className="field-label">Knowledge Domain</label>
                    <input
                      className="field-input"
                      value={agent.persona?.domain ?? ""}
                      readOnly
                      title="Read-only — edit via API"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">Primary Language Model</label>
                  <input className="field-input" value="English (US)" readOnly />
                </div>
                <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--primary-dim)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 12.5, color: "var(--primary-text)" }}>
                  ℹ️  Agent identity changes require <code>POST /api/agent/init</code> to create a new agent.
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-icon">🤖</div>
                <div className="empty-title">No agent configured</div>
                <div className="empty-desc">Call <code>POST /api/agent/init</code> to create an agent.</div>
              </div>
            )}
          </div>

          {/* LLM Providers */}
          <div className="card card-lg">
            <div className="section-heading">
              <span>⚡</span> LLM Providers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Groq — configured and active */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--orange-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "var(--orange-text)", flexShrink: 0 }}>G</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>Groq</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>llama-3-70b</div>
                </div>
                <span className="badge badge-online" style={{ fontSize: 10 }}>● Online</span>
              </div>

              {/* Status summary */}
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-input)", border: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-muted)" }}>
                Only Groq is configured. Additional LLM providers require code changes to <code>src/lib/llm.ts</code>.
              </div>
            </div>

            {/* Resource load placeholder */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="stat-label" style={{ marginBottom: 0 }}>Resource Load</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Live data unavailable</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Persona Synthesis + Execution Schedule */}
        <div className="grid-2" style={{ gap: 20 }}>
          {/* Persona Synthesis */}
          <div className="card card-lg">
            <div className="section-heading">
              <span>🧬</span> Persona Synthesis
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.55 }}>
              The active behavioral archetype governs the agent&apos;s tone, vocabulary, and decision-making heuristic.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {[
                { name: "The Analyst",    desc: "Data-driven, concise, objective. Focuses on metrics and logical deductions.", active: true },
                { name: "The Provocateur", desc: "Challenging, opinionated, engaging. Asks difficult questions and takes unconventional positions.", active: false },
                { name: "The Educator",   desc: "Patient, detailed, structured. Breaks down complex topics into digestible explanations.", active: false },
              ].map(({ name, desc, active }) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    background: active ? "var(--bg-elevated)" : "transparent",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                    cursor: "not-allowed",
                    opacity: active ? 1 : 0.55,
                  }}
                >
                  <div style={{
                    width: 18, height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${active ? "var(--primary)" : "var(--border-strong)"}`,
                    background: active ? "var(--primary)" : "transparent",
                    flexShrink: 0,
                    marginTop: 2,
                  }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "9px 14px", borderRadius: "var(--radius-md)", background: "var(--primary-dim)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 12.5, color: "var(--primary-text)" }}>
              ℹ️  Persona switching is not yet supported via the UI.
            </div>
          </div>

          {/* Execution Schedule */}
          <div className="card card-lg">
            <div className="section-heading">
              <span>⏰</span> Execution Schedule
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.55 }}>
              The agent executes via <code>scripts/cron-tick.ts</code> when triggered by an external scheduler or the <strong>Trigger Run</strong> button.
            </p>

            <div style={{ marginBottom: 16 }}>
              <div className="field-label">Run Frequency</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Configured externally</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>MANUAL / CRON</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "50%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>High frequency</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Low frequency</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="field-label">Active Window (UTC)</div>
              <div className="grid-2" style={{ gap: 10 }}>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", padding: "10px 14px", textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>00:00</div>
                </div>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", padding: "10px 14px", textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>23:59</div>
                </div>
              </div>
            </div>

            {/* Rate limit toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>Respect Rate Limits</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Auto-pause if provider limits are near</div>
              </div>
              <label className="toggle" title="Read-only — always enabled">
                <input type="checkbox" defaultChecked disabled />
                <div className="toggle-slider" />
              </label>
            </div>

            <div style={{ marginTop: 14, padding: "9px 14px", borderRadius: "var(--radius-md)", background: "var(--primary-dim)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 12.5, color: "var(--primary-text)" }}>
              ℹ️  Schedule configuration is read-only. Edit <code>scripts/cron-tick.ts</code> to modify schedule behaviour.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

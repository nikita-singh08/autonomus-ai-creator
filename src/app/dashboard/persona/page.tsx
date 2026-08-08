import { prisma } from "@/lib/prisma";

// ============================================================
// Agent Persona — /dashboard/persona
// ============================================================
// Read-only. No edit API exists. Displays real Persona data.
// Never shows secrets, API keys, or fabricated values.
// ============================================================

export const dynamic = "force-dynamic";

export default async function PersonaPage() {
  const agent = await prisma.agent.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      persona: true,
    },
  });

  const persona = agent?.persona ?? null;

  function safeArray(val: unknown): string[] {
    if (!val) return [];
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch { return []; }
  }

  interface VoiceRules {
    toneDescription?: string;
    styleNotes?: string;
    bannedPhrases?: string[];
  }

  function safeVoiceRules(val: unknown): VoiceRules {
    if (!val) return {};
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      return (parsed as VoiceRules) ?? {};
    } catch { return {}; }
  }

  const voice      = safeVoiceRules(persona?.voiceRules);
  const pillars    = safeArray(persona?.pillars);
  const antiTopics = safeArray(persona?.antiTopics);
  const banned     = safeArray(voice.bannedPhrases ?? []);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <div style={{
          width: 72, height: 72,
          background: "var(--primary-dim)",
          border: "3px solid var(--primary)",
          borderRadius: "var(--radius-lg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, flexShrink: 0,
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              {persona?.name ?? "No Persona"}
            </h1>
            <span className="badge badge-online" style={{ fontSize: 11 }}>
              {persona ? "Online" : "Offline"}
            </span>
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
            {persona?.domain ?? "No domain configured"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="btn btn-outline btn-sm" style={{ opacity: 0.5, cursor: "not-allowed" }} title="Edit not yet supported">
            ✏ Edit Core
          </span>
        </div>
      </div>

      {!persona ? (
        <div className="empty-state">
          <div className="empty-icon">🧬</div>
          <div className="empty-title">No persona configured</div>
          <div className="empty-desc">
            Call <code>POST /api/agent/init</code> to create an agent with a persona.
          </div>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: 20 }}>
          {/* Left: Identity Core */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Identity */}
            <div className="card card-lg">
              <div className="section-heading">
                <span>⚙️</span> Identity Core
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div className="field-label">Domain</div>
                  <div className="field-value">{persona.domain}</div>
                </div>
                <div>
                  <div className="field-label">Persona Name</div>
                  <div className="field-value">{persona.name}</div>
                </div>
                <div>
                  <div className="field-label">Version</div>
                  <div className="field-value-mono">v{persona.version}</div>
                </div>
                <div>
                  <div className="field-label">Created</div>
                  <div className="field-value-mono" style={{ fontSize: 12 }}>
                    {new Date(persona.createdAt).toISOString()}
                  </div>
                </div>
                <div>
                  <div className="field-label">Agent ID</div>
                  <div className="field-value-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {agent!.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only notice */}
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--primary-dim)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 12.5, color: "var(--primary-text)" }}>
              ℹ️  Persona editing is read-only. Persona update endpoints are not yet implemented.
            </div>
          </div>

          {/* Right: Persona Configuration */}
          <div className="card card-lg">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div className="section-heading" style={{ margin: 0 }}>
                <span>🧬</span> Persona Configuration
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>v{persona.version}</span>
                <span className="badge badge-online" style={{ fontSize: 10 }}>Active</span>
              </div>
            </div>

            {/* Voice Description */}
            {(voice.toneDescription || voice.styleNotes) && (
              <div style={{ marginBottom: 20 }}>
                <div className="field-label">Voice Description</div>
                <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {voice.toneDescription && <p style={{ marginBottom: voice.styleNotes ? 8 : 0 }}>{voice.toneDescription}</p>}
                  {voice.styleNotes && <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{voice.styleNotes}</p>}
                </div>
              </div>
            )}

            {/* Pillars + Anti-Topics */}
            <div className="grid-2" style={{ marginBottom: 20, gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 13 }}>✅</span>
                  <span className="field-label" style={{ marginBottom: 0 }}>Content Pillars</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {pillars.length > 0
                    ? pillars.map((p, i) => <span key={i} className="tag tag-pillar">{p}</span>)
                    : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None configured</span>
                  }
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 13 }}>🚫</span>
                  <span className="field-label" style={{ marginBottom: 0 }}>Anti-Topics</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {antiTopics.length > 0
                    ? antiTopics.map((a, i) => <span key={i} className="tag tag-anti">{a}</span>)
                    : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None configured</span>
                  }
                </div>
              </div>
            </div>

            {/* Banned Phrases */}
            <div>
              <div className="field-label">Banned Phrases List</div>
              <div style={{ background: "var(--bg-input)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1px solid var(--border-strong)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {banned.length > 0
                  ? banned.map((phrase, i) => (
                    <span key={i} className="tag tag-phrase">&quot;{phrase}&quot;</span>
                  ))
                  : <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>No banned phrases configured.</span>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

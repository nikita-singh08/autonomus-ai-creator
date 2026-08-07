// ============================================================
// Dashboard page — optional human-facing view
// ============================================================
// TODO (Milestone 5 – Polish): Implement real dashboard UI.
// This page will display:
//   - Live feed of published posts with rationale
//   - TickLog history showing "published" / "held" / "killed" cycles
//   - Agent status and persona config summary

export default function DashboardPage() {
  // TODO (Milestone 5): Fetch feed via GET /api/agent/feed and TickLog data.
  // Render a rich UI showing the agent's autonomous activity.

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Agent Dashboard</h1>
      <p>
        <strong>TODO (Milestone 5):</strong> This dashboard will show the live
        post feed, held/killed cycle history, and agent status.
      </p>
      <p>
        For now, query the API directly:
      </p>
      <ul>
        <li>
          <code>POST /api/agent/init</code> — create agent + persona
        </li>
        <li>
          <code>GET /api/agent/feed?agentId=&lt;id&gt;</code> — get posts
        </li>
        <li>
          <code>POST /api/agent/tick</code> — trigger a manual tick
        </li>
      </ul>
    </main>
  );
}

"use client";

import { useState } from "react";

type State = "idle" | "loading" | "published" | "held" | "error";

export default function TriggerRunButton({ agentId }: { agentId: string | null }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleClick() {
    if (!agentId) {
      setMessage("No agent found");
      setState("error");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/agent/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "Request failed");
        return;
      }
      const outcome = data.outcome ?? "held";
      setState(outcome === "published" ? "published" : outcome === "killed" ? "error" : "held");
      setMessage(outcome === "published" ? "Published!" : outcome === "held" ? "Held" : "Killed");
    } catch {
      setState("error");
      setMessage("Network error");
    } finally {
      // Reset to idle after 4 s
      setTimeout(() => { setState("idle"); setMessage(""); }, 4000);
    }
  }

  const label =
    state === "loading"   ? "Running…"   :
    state === "published" ? "✓ Published" :
    state === "held"      ? "○ Held"      :
    state === "error"     ? `⚠ ${message || "Error"}` :
    "▷ Trigger Run";

  const extra: React.CSSProperties = {};
  if (state === "published") { extra.borderColor = "rgba(16,185,129,0.5)"; extra.background = "rgba(16,185,129,0.12)"; extra.color = "var(--status-published)"; }
  if (state === "held")      { extra.borderColor = "rgba(249,115,22,0.5)"; extra.background = "var(--orange-dim)"; extra.color = "var(--orange-text)"; }
  if (state === "error")     { extra.borderColor = "rgba(239,68,68,0.5)";  extra.background = "rgba(239,68,68,0.1)"; extra.color = "var(--status-killed)"; }

  return (
    <button
      className={`btn-trigger ${state === "loading" ? "loading" : ""}`}
      style={extra}
      onClick={handleClick}
      disabled={state === "loading" || !agentId}
      title={agentId ? `Run tick for agent ${agentId}` : "No agent available"}
    >
      {label}
    </button>
  );
}

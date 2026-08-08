"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import TriggerRunButton from "./TriggerRunButton";

interface Agent {
  id: string;
  name: string;
}

interface SidebarProps {
  agent: Agent | null;
}

function navItems() {
  return [
    { href: "/dashboard",          label: "Dashboard", icon: GridIcon },
    { href: "/dashboard/content",  label: "Content",   icon: ContentIcon },
    { href: "/dashboard/topics",   label: "Topics",    icon: TopicsIcon },
    { href: "/dashboard/activity", label: "Activity",  icon: ActivityIcon },
    { href: "/dashboard/persona",  label: "Persona",   icon: PersonaIcon },
    { href: "/dashboard/settings", label: "Settings",  icon: SettingsIcon },
  ];
}

export default function AppShell({
  children,
  agent,
}: {
  children: React.ReactNode;
  agent: Agent | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const initials = agent?.name
    ? agent.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "AG";

  return (
    <div className="app-shell">
      {/* === Mobile overlay === */}
      <div
        className={`sidebar-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* === Sidebar === */}
      <nav className={`sidebar ${open ? "open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <span className="sidebar-logo-text">Creator</span>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {navItems().map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Agent profile */}
        <div className="sidebar-agent">
          <div className="sidebar-agent-avatar">{initials}</div>
          <div>
            <div className="sidebar-agent-name">
              {agent?.name ?? "No Agent"}
            </div>
            <div className="sidebar-agent-status">
              {agent ? "Active" : "Offline"}
            </div>
          </div>
        </div>
      </nav>

      {/* === Main === */}
      <div className="main-area">
        {/* Desktop topbar */}
        <div className="topbar">
          <div className="breadcrumb">
            <span>Autonomous</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Agent Intelligence</span>
          </div>
          <TriggerRunButton agentId={agent?.id ?? null} />
        </div>

        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Creator</span>
          <div style={{ marginLeft: "auto" }}>
            <TriggerRunButton agentId={agent?.id ?? null} />
          </div>
        </div>

        {/* Page body */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Icon components ─────────────────────────────────────── */

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function ContentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  );
}
function TopicsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function PersonaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

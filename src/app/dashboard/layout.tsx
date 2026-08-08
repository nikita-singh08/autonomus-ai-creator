import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";

// Dashboard layout: loads first agent from DB once, passes to AppShell.
// All child pages (Server Components) can also fetch the same agent independently.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load the first agent (demo default). No agent name stored on Agent model;
  // we use the Persona name as the display name for the sidebar.
  const agentRecord = await prisma.agent.findFirst({
    select: {
      id: true,
      persona: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const agent = agentRecord
    ? { id: agentRecord.id, name: agentRecord.persona?.name ?? "Agent" }
    : null;

  return <AppShell agent={agent}>{children}</AppShell>;
}

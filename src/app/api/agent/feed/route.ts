// ============================================================
// GET /api/agent/feed
// ============================================================
// Returns published posts for a given agentId, newest first.
// Query param: ?agentId=<id>

import { NextRequest, NextResponse } from "next/server";
import { getFeedPosts } from "@/agent/postStore";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing required query param: agentId" },
        { status: 400 }
      );
    }

    const posts = await getFeedPosts(agentId);
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    logger.error("GET /api/agent/feed failed", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

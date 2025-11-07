import { NextResponse } from "next/server";

/**
 * API root endpoint - lists all available endpoints
 * All backend routes are now proxied through the catch-all route at /api/[...path]
 */
export async function GET() {
  return NextResponse.json({
    message: "Welcome to Burpla API",
    description: "All backend FastAPI routes are proxied through /api/[...path]",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    endpoints: {
      // Root and health
      root: "/api/",
      health: "/api/health",
      docs: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/docs`,

      // Conversation management
      convoInit: "/api/convo_init?user_id=user_001",
      getSession: "/api/get_session?session_id=session_001",
      getUserInfo: "/api/get_user_info?user_id=user_001",
      getSessionUsersInfo: "/api/get_session_users_info?session_id=session_001",

      // Messaging
      sent: "/api/sent (POST)",

      // Voting
      vote: "/api/vote (POST with query params)",

      // Maps
      createMarkers: "/api/create_markers (POST)",

      // Legacy endpoints (still available)
      init: "/api/init",
      convo: "/api/convo",
      chat: "/api/chat",
      sessions: "/api/sessions",
      conversationSample: "/api/conversation-sample",
    },
    note: "All routes matching backend FastAPI endpoints are automatically proxied. Use /api/{backend_endpoint} to access any backend route.",
  });
}


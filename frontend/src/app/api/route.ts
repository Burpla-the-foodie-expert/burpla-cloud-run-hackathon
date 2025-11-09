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

      // Authentication
      authentication: "/api/authentication (POST)",

      // Session management
      sessionGetAll: "/api/session/get_all?user_id=user_001",
      sessionGet: "/api/session/get?session_id=session_001",
      sessionGetUsersInfo: "/api/session/get_users_info?session_id=session_001",
      sessionCreate: "/api/session/create (POST)",
      sessionUpdate: "/api/session/update (POST)",
      sessionDelete: "/api/session/delete (DELETE)",

      // User management
      userGet: "/api/user/get?user_id=user_001",
      userUpdate: "/api/user/update (POST)",
      userAdd: "/api/user/add (POST)",

      // Chat operations
      chatSent: "/api/chat/sent (POST)",
      chatVote: "/api/chat/vote (POST with query params)",
      chatCreateMarkers: "/api/chat/create_markers (POST)",

      // Legacy endpoints (deprecated, use new endpoints above)
      convoInit: "/api/session/get_all?user_id=user_001",
      getSession: "/api/session/get?session_id=session_001",
      getUserInfo: "/api/user/get?user_id=user_001",
      getSessionUsersInfo: "/api/session/get_users_info?session_id=session_001",
      sent: "/api/chat/sent (POST)",
      vote: "/api/chat/vote (POST with query params)",
      createMarkers: "/api/chat/create_markers (POST)",

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


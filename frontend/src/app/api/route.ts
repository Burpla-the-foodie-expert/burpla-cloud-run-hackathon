import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Welcome to Burpla API",
    endpoints: {
      health: "/api/health",
      init: "/api/init",
      convo: "/api/convo",
      sent: "/api/sent",
      chat: "/api/chat",
      sessions: "/api/sessions",
      conversationSample: "/api/conversation-sample",
    },
  });
}


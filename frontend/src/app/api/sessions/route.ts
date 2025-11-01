import { NextRequest, NextResponse } from "next/server";

// In-memory store for sessions (in production, use a database)
const sessions = new Map<string, {
  id: string;
  messages: Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    role: "user" | "assistant";
    timestamp: number;
  }>;
  users: Map<string, { name: string; joinedAt: number }>;
  createdAt: number;
}>();

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const lastMessageId = req.nextUrl.searchParams.get("lastMessageId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  // Filter messages newer than lastMessageId
  let filteredMessages = session.messages;
  if (lastMessageId) {
    const lastMessageIndex = session.messages.findIndex(
      (m) => m.id === lastMessageId
    );
    if (lastMessageIndex >= 0) {
      filteredMessages = session.messages.slice(lastMessageIndex + 1);
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    messages: filteredMessages,
    users: Array.from(session.users.entries()).map(([id, data]) => ({
      id,
      ...data,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, sessionId, userId, userName, message, messageId } =
      await req.json();

    if (action === "create") {
      const newSessionId = sessionId || generateId();
      if (!sessions.has(newSessionId)) {
        sessions.set(newSessionId, {
          id: newSessionId,
          messages: [],
          users: new Map(),
          createdAt: Date.now(),
        });
      }
      return NextResponse.json({ sessionId: newSessionId });
    }

    if (action === "join") {
      if (!sessionId || !userId || !userName) {
        return NextResponse.json(
          { error: "sessionId, userId, and userName are required" },
          { status: 400 }
        );
      }

      let session = sessions.get(sessionId);
      if (!session) {
        // Create session if it doesn't exist
        session = {
          id: sessionId,
          messages: [],
          users: new Map(),
          createdAt: Date.now(),
        };
        sessions.set(sessionId, session);
      }

      session.users.set(userId, {
        name: userName,
        joinedAt: Date.now(),
      });

      return NextResponse.json({ success: true });
    }

    if (action === "send") {
      if (!sessionId || !userId || !message) {
        return NextResponse.json(
          { error: "sessionId, userId, and message are required" },
          { status: 400 }
        );
      }

      let session = sessions.get(sessionId);
      if (!session) {
        // Create session if it doesn't exist
        session = {
          id: sessionId,
          messages: [],
          users: new Map(),
          createdAt: Date.now(),
        };
        sessions.set(sessionId, session);
      }

      const userData = session.users.get(userId);
      const isBot = userId === "burpla" || userId === "ai";
      const newMessage = {
        id: messageId || generateId(),
        userId,
        userName: isBot ? "Burpla" : (userData?.name || "Unknown"),
        content: message,
        role: isBot ? ("assistant" as const) : ("user" as const),
        timestamp: Date.now(),
      };

      // Remove duplicate if exists (for AI streaming updates)
      const existingIndex = session.messages.findIndex((m) => m.id === newMessage.id);
      if (existingIndex >= 0) {
        session.messages[existingIndex] = newMessage;
      } else {
        session.messages.push(newMessage);
      }

      return NextResponse.json({ success: true, message: newMessage });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}


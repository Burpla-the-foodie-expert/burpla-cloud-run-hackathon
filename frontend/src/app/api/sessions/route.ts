import { NextRequest, NextResponse } from "next/server";
import {
  sessions,
  type Session,
  type SessionMessage,
  type SessionUser,
  removeUserFromSessions,
} from "@/lib/session-store";
import { getApiUrl } from "@/lib/api-config";
import { parseMessageForCard } from "@/lib/conversation-utils";

// Sessions are stored in the shared session-store module for access across API routes

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load messages from backend database and convert to frontend format
 */
async function loadMessagesFromBackend(
  sessionId: string
): Promise<SessionMessage[]> {
  try {
    const backendUrl = getApiUrl(
      `/session/get?session_id=${encodeURIComponent(sessionId)}`
    );
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.warn(
        `Failed to load session ${sessionId} from backend:`,
        response.status
      );
      return [];
    }

    const backendMessages = await response.json();
    if (!Array.isArray(backendMessages)) {
      return [];
    }

    // Fetch user names for the session
    let userNamesMap = new Map<string, string>();
    try {
      const usersUrl = getApiUrl(
        `/session/get_users_info?session_id=${encodeURIComponent(sessionId)}`
      );
      const usersResponse = await fetch(usersUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (usersResponse.ok) {
        const usersInfo = await usersResponse.json();
        if (Array.isArray(usersInfo)) {
          usersInfo.forEach((user: any) => {
            if (user.user_id && user.name) {
              userNamesMap.set(user.user_id, user.name);
            }
          });
        }
      }
    } catch (error) {
      console.warn(
        "Failed to load user names for session, will use fallback:",
        error
      );
    }

    // Convert backend format to frontend format
    return backendMessages.map((msg: any) => {
      // Backend format: { session_id, user_id, message_id, content, timestamp }
      // Frontend format: { id, userId, userName, content, role, timestamp, cardConfig? }
      const isBot = msg.user_id === "bot" || msg.user_id === "burpla";
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).getTime()
        : Date.now();

      // Get user name from map, or fallback to a formatted version of user_id
      let userName: string;
      if (isBot) {
        userName = "Burpla";
      } else {
        const userId = msg.user_id || "unknown";
        userName = userNamesMap.get(userId) || userId;
        // If still using userId, try to format it nicely (e.g., "user_001" -> "User 001")
        if (userName === userId && userId.startsWith("user_")) {
          const numPart = userId.replace("user_", "");
          userName = `User ${numPart}`;
        }
      }

      // Parse card information from bot messages
      let content = msg.content || "";
      let cardConfig: any = undefined;

      if (isBot && content) {
        // Parse message content to extract card information
        const parsed = parseMessageForCard(content, undefined); // userLocation not available in server-side route
        content = parsed.content;
        cardConfig = parsed.cardConfig;
      }

      return {
        id: msg.message_id || generateId(),
        userId: msg.user_id || "unknown",
        userName,
        content,
        role: isBot ? ("assistant" as const) : ("user" as const),
        timestamp,
        ...(cardConfig && { cardConfig }), // Only include cardConfig if it exists
      };
    });
  } catch (error) {
    console.error(
      `Error loading messages from backend for session ${sessionId}:`,
      error
    );
    return [];
  }
}

/**
 * Save message to backend database
 * Uses the actual user_id from authentication (backend accepts any user_id format)
 * Ensures session exists before saving message
 */
async function saveMessageToBackend(
  sessionId: string,
  userId: string,
  messageId: string,
  content: string
): Promise<void> {
  try {
    // Only save user messages to backend (bot messages are saved by the backend /chat/sent endpoint)
    if (userId === "burpla" || userId === "ai" || userId === "bot") {
      return; // Bot messages are handled by backend /chat/sent endpoint
    }

    // First, ensure the user exists in the backend (required for saving messages)
    try {
      const userCheckUrl = getApiUrl(
        `/user/get?user_id=${encodeURIComponent(userId)}`
      );
      const userCheckResponse = await fetch(userCheckUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (userCheckResponse.status === 404) {
        console.error(
          `[saveMessageToBackend] User ${userId} not found in backend. Message cannot be saved.`
        );
        // Don't continue - the backend will reject this anyway
        return;
      }
    } catch (userCheckError) {
      console.warn(
        `[saveMessageToBackend] Error checking user ${userId}:`,
        userCheckError
      );
      // Continue anyway - try to save the message and let backend handle it
    }

    // Check if session exists in the backend - don't create it automatically
    // Sessions must be created explicitly by the user with a name
    try {
      const sessionCheckUrl = getApiUrl(
        `/session/get?session_id=${encodeURIComponent(sessionId)}`
      );
      const sessionCheckResponse = await fetch(sessionCheckUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // If session doesn't exist (404), don't create it - return early
      if (sessionCheckResponse.status === 404) {
        console.warn(
          `[saveMessageToBackend] Session ${sessionId} not found. Session must be created explicitly by the user.`
        );
        return; // Don't save message to non-existent session
      }
    } catch (sessionCheckError) {
      console.warn(
        `[saveMessageToBackend] Error checking session ${sessionId}:`,
        sessionCheckError
      );
      // Don't continue - session must exist
      return;
    }

    // Use the actual userId from authentication - backend now accepts any user_id format
    const backendUrl = getApiUrl("/chat/sent");
    console.log(`[saveMessageToBackend] Saving message to backend:`, {
      sessionId,
      userId,
      messageId,
      contentLength: content.length,
    });

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId, // Use the actual user_id from authentication
        message: content,
        session_id: sessionId,
        is_to_agent: false, // Don't trigger AI response, just save the message
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorText = await response.text().catch(() => "");
      console.error(
        `[saveMessageToBackend] Backend save failed for session ${sessionId}:`,
        {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorText,
        }
      );
      // Don't throw - allow message to be saved in memory even if backend save fails
    } else {
      console.log(
        `[saveMessageToBackend] Message saved successfully to backend for session ${sessionId}`
      );
    }
  } catch (error) {
    console.error(
      `[saveMessageToBackend] Error saving message to backend for session ${sessionId}:`,
      error
    );
    // Don't throw - allow message to be saved in memory even if backend save fails
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const lastMessageId = req.nextUrl.searchParams.get("lastMessageId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  let session = sessions.get(sessionId);

  // If session not in memory, try to load from backend database
  if (!session) {
    const backendMessages = await loadMessagesFromBackend(sessionId);

    if (backendMessages.length > 0) {
      // Create session from backend data
      session = {
        id: sessionId,
        messages: backendMessages.sort((a, b) => a.timestamp - b.timestamp),
        users: new Map<string, SessionUser>(),
        createdAt: Date.now(),
      };

      // Extract users from messages
      backendMessages.forEach((msg) => {
        if (msg.userId && msg.userId !== "bot" && msg.userId !== "burpla") {
          if (!session!.users.has(msg.userId)) {
            session!.users.set(msg.userId, {
              name: msg.userName || msg.userId,
              joinedAt: msg.timestamp,
            });
          }
        }
      });

      sessions.set(sessionId, session);
    } else {
      // No session found in backend either
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
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
    const body = await req.json();
    const {
      action,
      sessionId,
      userId,
      userName,
      message,
      messageId,
      cardConfig,
    } = body;

    if (action === "create") {
      let newSessionId = sessionId || generateId();

      // Get user info from request body (userId and userName should be provided)
      const requestUserId = userId || generateId();
      const requestUserName = userName || "User";

      // Require session name - don't auto-generate
      if (!body.sessionName || !body.sessionName.trim()) {
        return NextResponse.json(
          { error: "Session name is required" },
          { status: 400 }
        );
      }
      const requestSessionName = body.sessionName.trim();

      // Use the actual user_id from authentication - backend accepts any user_id format
      // Create session in backend database
      try {
        const backendUrl = getApiUrl("/session/create");
        const createResponse = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_id: requestUserId,
            session_name: requestSessionName,
            user_id_list: [requestUserId],
          }),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          // Use the session_id returned from backend if available
          if (createData.session_id) {
            newSessionId = createData.session_id;
          }
        } else {
          console.warn(
            "Failed to create session in backend:",
            await createResponse.text()
          );
        }
      } catch (error) {
        console.error("Failed to create session in backend:", error);
        // Continue anyway - session will be created in memory
      }

      // Also create in-memory session
      if (!sessions.has(newSessionId)) {
        sessions.set(newSessionId, {
          id: newSessionId,
          messages: [],
          users: new Map<string, SessionUser>(),
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

      // First, join the session in the backend database
      // This adds the user to the session's member_id_list
      try {
        const backendUrl = getApiUrl("/session/join");
        const joinResponse = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
          }),
        });

        if (!joinResponse.ok) {
          const errorData = await joinResponse.json().catch(() => ({}));
          const errorMessage =
            errorData.detail ||
            errorData.error ||
            "Failed to join session in backend";
          console.error("Failed to join session in backend:", errorMessage);
          return NextResponse.json(
            { error: errorMessage },
            { status: joinResponse.status }
          );
        }
      } catch (error) {
        console.error("Error joining session in backend:", error);
        return NextResponse.json(
          { error: "Failed to join session. Please try again." },
          { status: 500 }
        );
      }

      // Check if session exists in backend - don't create it automatically
      let session = sessions.get(sessionId);
      if (!session) {
        // Try to load from backend database first
        const backendMessages = await loadMessagesFromBackend(sessionId);

        if (backendMessages.length > 0) {
          // Create session from backend data
          session = {
            id: sessionId,
            messages: backendMessages.sort((a, b) => a.timestamp - b.timestamp),
            users: new Map<string, SessionUser>(),
            createdAt: Date.now(),
          };

          // Extract users from messages
          backendMessages.forEach((msg) => {
            if (msg.userId && msg.userId !== "bot" && msg.userId !== "burpla") {
              if (!session!.users.has(msg.userId)) {
                session!.users.set(msg.userId, {
                  name: msg.userName || msg.userId,
                  joinedAt: msg.timestamp,
                });
              }
            }
          });
        } else {
          // Session doesn't exist - return error instead of creating it
          return NextResponse.json(
            { error: "Session not found. Please create a session first." },
            { status: 404 }
          );
        }

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

      // Use the actual user_id from authentication - backend accepts any user_id format
      let session = sessions.get(sessionId);
      if (!session) {
        // Try to load from backend database first
        const backendMessages = await loadMessagesFromBackend(sessionId);

        if (backendMessages.length > 0) {
          // Create session from backend data
          session = {
            id: sessionId,
            messages: backendMessages.sort((a, b) => a.timestamp - b.timestamp),
            users: new Map<string, SessionUser>(),
            createdAt: Date.now(),
          };

          // Extract users from messages
          backendMessages.forEach((msg) => {
            if (msg.userId && msg.userId !== "bot" && msg.userId !== "burpla") {
              if (!session!.users.has(msg.userId)) {
                session!.users.set(msg.userId, {
                  name: msg.userName || msg.userId,
                  joinedAt: msg.timestamp,
                });
              }
            }
          });
        } else {
          // Session doesn't exist in backend - return error instead of creating it
          return NextResponse.json(
            { error: "Session not found. Please create a session first." },
            { status: 404 }
          );
        }

        sessions.set(sessionId, session);
      }

      const userData = session.users.get(userId);
      const isBot = userId === "burpla" || userId === "ai" || userId === "bot";
      const finalMessageId = messageId || generateId();
      const newMessage: SessionMessage = {
        id: finalMessageId,
        userId,
        userName: isBot ? "Burpla" : userData?.name || "Unknown",
        content: message,
        role: isBot ? ("assistant" as const) : ("user" as const),
        timestamp: Date.now(),
        ...(cardConfig && { cardConfig }), // Include cardConfig if provided
      };

      // Enhanced deduplication: check by ID, userId+content+timestamp, and content+timestamp
      // This prevents duplicates when userId might change between save and load
      const existingById = session.messages.findIndex(
        (m) => m.id === newMessage.id
      );
      const existingByKey = session.messages.findIndex(
        (m) =>
          m.userId === newMessage.userId &&
          m.content === newMessage.content &&
          Math.abs(m.timestamp - newMessage.timestamp) < 1000 // Within 1 second
      );
      const existingByContent = session.messages.findIndex(
        (m) =>
          m.content === newMessage.content &&
          Math.abs(m.timestamp - newMessage.timestamp) < 500 // Within 500ms (likely duplicate)
      );

      if (existingById >= 0) {
        // Update existing message by ID
        session.messages[existingById] = newMessage;
      } else if (existingByKey >= 0) {
        // Update existing message with same userId+content+timestamp
        session.messages[existingByKey] = newMessage;
      } else if (existingByContent >= 0) {
        // Skip if same content+timestamp exists (likely a duplicate with different userId)
        // Don't add the duplicate
        console.log(
          `Skipping duplicate message: ${newMessage.content.substring(0, 50)}`
        );
      } else {
        // New message, add it
        session.messages.push(newMessage);
      }

      // Save user messages to backend database (bot messages are saved by backend /chat/sent endpoint)
      // Only save if not a bot message and if is_to_agent is false (to avoid duplicate saves)
      // If the message mentions @burpla, it will be sent again with is_to_agent: true from the frontend
      if (!isBot) {
        // Save message to backend (this will be called with is_to_agent: false)
        // The frontend will call /chat/sent again with is_to_agent: true if @burpla is mentioned
        await saveMessageToBackend(sessionId, userId, finalMessageId, message);
      }

      return NextResponse.json({ success: true, message: newMessage });
    }

    if (action === "logout") {
      const { userId } = body;

      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required for logout" },
          { status: 400 }
        );
      }

      // Remove user from all sessions
      removeUserFromSessions(userId);

      return NextResponse.json({
        success: true,
        message: "User logged out from all sessions",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

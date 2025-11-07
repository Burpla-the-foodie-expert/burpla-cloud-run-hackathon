/**
 * Shared session store for accessing session data across API routes
 * This allows /api/sent to access conversation context directly
 */

import type { InteractiveCardConfig } from "@/components/ai-elements/interactive-card";

export interface SessionMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: InteractiveCardConfig;
}

export interface SessionUser {
  name: string;
  joinedAt: number;
}

export interface Session {
  id: string;
  messages: SessionMessage[];
  users: Map<string, SessionUser>;
  createdAt: number;
}

// In-memory store for sessions (shared with /api/sessions)
export const sessions = new Map<string, Session>();

/**
 * Get conversation context from a session
 * Returns messages formatted for AI context (last N messages)
 */
export function getConversationContext(
  sessionId: string,
  limit: number = 20
): Array<{ role: "user" | "assistant" | "system"; content: string; name?: string }> {
  const session = sessions.get(sessionId);

  if (!session || !session.messages || session.messages.length === 0) {
    return [];
  }

  // Get last N messages
  const recentMessages = session.messages.slice(-limit);

  // Convert to AI message format
  return recentMessages.map((msg) => {
    return {
      role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: msg.content,
      // Include user name for multi-user context (except for Burpla)
      ...(msg.userName && msg.userName !== "Burpla" && { name: msg.userName }),
    };
  });
}

/**
 * Get session users for context
 */
export function getSessionUsers(sessionId: string): SessionUser[] {
  const session = sessions.get(sessionId);

  if (!session || !session.users) {
    return [];
  }

  return Array.from(session.users.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));
}

/**
 * Build system message with conversation context
 */
export function buildSystemMessage(
  userName?: string,
  userLocation?: { lat: number; lng: number },
  sessionUsers?: SessionUser[]
): string {
  let systemMessage = "You are Burpla, a helpful AI assistant. Your name is @burpla. When users mention \"@burpla\" in their messages, they are addressing you directly.";

  if (userName) {
    systemMessage += ` The current user's name is ${userName}.`;
  }

  if (sessionUsers && sessionUsers.length > 0) {
    const otherUsers = sessionUsers
      .filter((u) => u.name !== userName && u.name !== "Burpla")
      .map((u) => u.name);

    if (otherUsers.length > 0) {
      systemMessage += ` Other participants in this conversation: ${otherUsers.join(", ")}.`;
    }
  }

  if (userLocation) {
    systemMessage += ` The user's current location is approximately ${userLocation.lat}, ${userLocation.lng}. Use this information to provide location-based recommendations, calculate distances, and suggest nearby places.`;
  }

  systemMessage += " Always respond as Burpla when users mention you with @burpla. Remember the conversation context and refer back to previous messages when relevant.";

  return systemMessage;
}


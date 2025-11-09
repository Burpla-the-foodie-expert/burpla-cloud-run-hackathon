/**
 * Shared message cache to reduce backend API calls
 * Multiple components can subscribe to the same session's messages
 */

import { loadSessionMessagesFromBackend } from "./conversation-utils";

export interface CachedMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: any;
}

interface SessionCache {
  messages: CachedMessage[];
  lastMessageId: string | null;
  lastFetchTime: number;
  subscribers: Set<(messages: CachedMessage[]) => void>;
  isPolling: boolean;
  pollInterval: NodeJS.Timeout | null;
  isUserTyping: boolean; // Flag to pause polling when user is typing
  typingTimeout: NodeJS.Timeout | null; // Timeout to resume polling after user stops typing
}

const cache = new Map<string, SessionCache>();
const CACHE_TTL = 5000; // 5 seconds - messages are fresh for this long
const POLL_INTERVAL = 5000; // Poll every 5 seconds instead of 2
const MAX_POLL_INTERVAL = 30000; // Max 30 seconds if no activity

/**
 * Get or create a session cache
 */
function getOrCreateCache(sessionId: string): SessionCache {
  if (!cache.has(sessionId)) {
    cache.set(sessionId, {
      messages: [],
      lastMessageId: null,
      lastFetchTime: 0,
      subscribers: new Set(),
      isPolling: false,
      pollInterval: null,
      isUserTyping: false,
      typingTimeout: null,
    });
  }
  return cache.get(sessionId)!;
}

/**
 * Subscribe to session messages
 * Returns current messages and a function to unsubscribe
 */
export function subscribeToMessages(
  sessionId: string,
  callback: (messages: CachedMessage[]) => void,
  userLocation?: { lat: number; lng: number } | null
): () => void {
  if (!sessionId) {
    return () => {};
  }

  const sessionCache = getOrCreateCache(sessionId);
  sessionCache.subscribers.add(callback);

  // Send current messages immediately
  if (sessionCache.messages.length > 0) {
    callback(sessionCache.messages);
  }

  // Start polling if not already polling
  if (!sessionCache.isPolling) {
    startPolling(sessionId, userLocation);
  }

  // Return unsubscribe function
  return () => {
    sessionCache.subscribers.delete(callback);
    // Stop polling if no more subscribers
    if (sessionCache.subscribers.size === 0) {
      stopPolling(sessionId);
    }
  };
}

/**
 * Start polling for a session
 */
function startPolling(
  sessionId: string,
  userLocation?: { lat: number; lng: number } | null
): void {
  const sessionCache = getOrCreateCache(sessionId);

  if (sessionCache.isPolling) {
    return;
  }

  sessionCache.isPolling = true;

  // Initial load
  fetchMessages(sessionId, userLocation);

  // Set up polling interval
  // Use longer interval if tab is not active
  const getPollInterval = () => {
    if (typeof document !== "undefined" && document.hidden) {
      return MAX_POLL_INTERVAL;
    }
    return POLL_INTERVAL;
  };

  const poll = () => {
    // Don't poll if user is actively typing to avoid interrupting input
    if (sessionCache.isUserTyping) {
      return;
    }
    // Always fetch to check for new messages from other users
    // The fetchMessages function will handle deduplication and only notify if messages changed
    fetchMessages(sessionId, userLocation);
  };

  sessionCache.pollInterval = setInterval(poll, getPollInterval());

  // Update interval when tab visibility changes
  if (typeof document !== "undefined") {
    const handleVisibilityChange = () => {
      if (sessionCache.pollInterval) {
        clearInterval(sessionCache.pollInterval);
      }
      sessionCache.pollInterval = setInterval(poll, getPollInterval());
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
}

/**
 * Stop polling for a session
 */
function stopPolling(sessionId: string): void {
  const sessionCache = cache.get(sessionId);
  if (!sessionCache) return;

  if (sessionCache.pollInterval) {
    clearInterval(sessionCache.pollInterval);
    sessionCache.pollInterval = null;
  }
  sessionCache.isPolling = false;
}

/**
 * Fetch messages from backend and update cache
 */
async function fetchMessages(
  sessionId: string,
  userLocation?: { lat: number; lng: number } | null
): Promise<void> {
  const sessionCache = getOrCreateCache(sessionId);

  try {
    const messages = await loadSessionMessagesFromBackend(sessionId, userLocation);

    // Merge with existing cache to preserve optimistic messages that might not be in backend yet
    // Create a map of backend messages by ID for quick lookup
    const backendMessagesMap = new Map<string, CachedMessage>();
    messages.forEach((msg) => {
      backendMessagesMap.set(msg.id, msg);
    });

    // Keep optimistic messages that are very recent (within last 5 seconds) and not yet in backend
    // Check by content+userId+timestamp to handle cases where backend generates different message IDs
    const now = Date.now();
    const recentOptimisticMessages = sessionCache.messages.filter((msg) => {
      const isRecent = now - msg.timestamp < 5000; // Within last 5 seconds
      if (!isRecent) return false;

      // Check if this message exists in backend by content+userId+timestamp (not just ID)
      // Backend might have a different message ID
      const existsInBackend = Array.from(backendMessagesMap.values()).some((backendMsg) => {
        const sameUser = backendMsg.userId === msg.userId;
        const sameContent = backendMsg.content === msg.content;
        // Allow timestamp difference of up to 2 seconds (backend might have slightly different timestamp)
        const timestampDiff = Math.abs(backendMsg.timestamp - msg.timestamp);
        return sameUser && sameContent && timestampDiff < 2000;
      });

      return !existsInBackend;
    });

    // Combine backend messages with recent optimistic messages
    // Backend messages come first so they take precedence in deduplication
    const allMessages = [...messages, ...recentOptimisticMessages];

    // Sort by timestamp and deduplicate
    const sortedMessages = allMessages.sort((a, b) => a.timestamp - b.timestamp);
    const deduplicatedMessages: CachedMessage[] = [];
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();

    sortedMessages.forEach((msg) => {
      const idKey = msg.id;
      // Use a more lenient content key that allows timestamp differences
      // Round timestamp to nearest second to handle small timestamp differences
      const timestampRounded = Math.floor(msg.timestamp / 1000) * 1000;
      const contentKey = `${msg.userId}:${msg.content.substring(0, 50)}:${timestampRounded}`;

      // Check if we've seen this message by ID or by content+userId+timestamp
      const seenById = seenIds.has(idKey);
      const seenByContent = seenKeys.has(contentKey);

      if (!seenById && !seenByContent) {
        seenIds.add(idKey);
        seenKeys.add(contentKey);
        deduplicatedMessages.push(msg);
      }
    });

    // Check if messages actually changed by comparing message count and last message ID
    const messagesChanged =
      sessionCache.messages.length !== deduplicatedMessages.length ||
      (deduplicatedMessages.length > 0 &&
       sessionCache.lastMessageId !== deduplicatedMessages[deduplicatedMessages.length - 1].id);

    // Update cache
    sessionCache.messages = deduplicatedMessages;
    sessionCache.lastFetchTime = Date.now();

    if (deduplicatedMessages.length > 0) {
      sessionCache.lastMessageId = deduplicatedMessages[deduplicatedMessages.length - 1].id;
    }

    // Only notify subscribers if messages actually changed
    if (messagesChanged) {
      sessionCache.subscribers.forEach((callback) => {
        callback(deduplicatedMessages);
      });
    }
  } catch (error) {
    console.error(`Failed to fetch messages for session ${sessionId}:`, error);
  }
}

/**
 * Manually refresh messages (e.g., after sending a new message)
 */
export async function refreshMessages(
  sessionId: string,
  userLocation?: { lat: number; lng: number } | null
): Promise<void> {
  await fetchMessages(sessionId, userLocation);
}

/**
 * Get cached messages synchronously (may be stale)
 */
export function getCachedMessages(sessionId: string): CachedMessage[] {
  const sessionCache = cache.get(sessionId);
  return sessionCache?.messages || [];
}

/**
 * Clear cache for a session
 */
export function clearCache(sessionId: string): void {
  const sessionCache = cache.get(sessionId);
  if (sessionCache) {
    stopPolling(sessionId);
    sessionCache.subscribers.clear();
    // Clear typing timeout if exists
    if (sessionCache.typingTimeout) {
      clearTimeout(sessionCache.typingTimeout);
      sessionCache.typingTimeout = null;
    }
  }
  cache.delete(sessionId);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  cache.forEach((_, sessionId) => {
    clearCache(sessionId);
  });
}

/**
 * Add a message optimistically to the cache (before backend confirms)
 */
export function addMessageToCache(
  sessionId: string,
  message: CachedMessage
): void {
  const sessionCache = getOrCreateCache(sessionId);

  // Check if message already exists (by ID or by content + userId + timestamp)
  const existingById = sessionCache.messages.findIndex((m) => m.id === message.id);
  const existingByKey = sessionCache.messages.findIndex(
    (m) =>
      m.userId === message.userId &&
      m.content === message.content &&
      Math.abs(m.timestamp - message.timestamp) < 1000 // Within 1 second
  );

  if (existingById >= 0) {
    // Update existing message by ID
    sessionCache.messages[existingById] = message;
  } else if (existingByKey >= 0) {
    // Update existing message with same userId+content+timestamp
    sessionCache.messages[existingByKey] = message;
  } else {
    // New message, add it and sort by timestamp
    sessionCache.messages.push(message);
    sessionCache.messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Update lastMessageId if this is the latest message
  if (sessionCache.messages.length > 0) {
    const lastMessage = sessionCache.messages[sessionCache.messages.length - 1];
    if (lastMessage.id === message.id) {
      sessionCache.lastMessageId = message.id;
    }
  }

  // Notify all subscribers
  sessionCache.subscribers.forEach((callback) => {
    callback([...sessionCache.messages]);
  });
}

/**
 * Mark that user is typing (pauses polling to avoid interrupting input)
 */
export function setUserTyping(sessionId: string, isTyping: boolean): void {
  const sessionCache = cache.get(sessionId);
  if (!sessionCache) return;

  sessionCache.isUserTyping = isTyping;

  // Clear existing timeout
  if (sessionCache.typingTimeout) {
    clearTimeout(sessionCache.typingTimeout);
    sessionCache.typingTimeout = null;
  }

  // If user stopped typing, resume polling after a short delay
  if (!isTyping) {
    sessionCache.typingTimeout = setTimeout(() => {
      sessionCache.isUserTyping = false;
      sessionCache.typingTimeout = null;
      // Immediately fetch messages if cache is stale
      const now = Date.now();
      if (now - sessionCache.lastFetchTime > CACHE_TTL) {
        fetchMessages(sessionId, null);
      }
    }, 1000); // Resume polling 1 second after user stops typing
  }
}


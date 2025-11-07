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
    const now = Date.now();
    // Only poll if cache is stale or we need to check for new messages
    if (now - sessionCache.lastFetchTime > CACHE_TTL) {
      fetchMessages(sessionId, userLocation);
    }
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

    // Update cache
    sessionCache.messages = messages;
    sessionCache.lastFetchTime = Date.now();

    if (messages.length > 0) {
      sessionCache.lastMessageId = messages[messages.length - 1].id;
    }

    // Notify all subscribers
    sessionCache.subscribers.forEach((callback) => {
      callback(messages);
    });
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


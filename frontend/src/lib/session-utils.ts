/**
 * Utility functions for session management
 * Handles URL, localStorage, and session ID operations
 */

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get session ID from URL query parameters
 */
export function getSessionIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("session");
}

/**
 * Set session ID in URL query parameters
 */
export function setSessionIdInUrl(sessionId: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  window.history.replaceState({}, "", url.toString());
}

/**
 * Remove session ID from URL query parameters
 */
export function removeSessionIdFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("session");
  window.history.replaceState({}, "", url.toString());
}

/**
 * Get current session ID from localStorage
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("currentSessionId");
}

/**
 * Set current session ID in localStorage
 */
export function setCurrentSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("currentSessionId", sessionId);
}

/**
 * Remove current session ID from localStorage
 */
export function removeCurrentSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("currentSessionId");
}

/**
 * Get user ID from localStorage or generate a new one
 */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return generateUserId();
  const userId = localStorage.getItem("userId");
  if (userId) return userId;
  const newUserId = generateUserId();
  localStorage.setItem("userId", newUserId);
  return newUserId;
}

/**
 * Get user name from localStorage
 */
export function getUserName(): string {
  if (typeof window === "undefined") return "User";
  return localStorage.getItem("userName") || "User";
}

/**
 * Copy session link to clipboard
 */
export function copySessionLink(sessionId: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot copy link in server environment"));
  }
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  return navigator.clipboard.writeText(url.toString());
}

/**
 * Initialize session from URL or localStorage
 * Returns the session ID if found, null otherwise
 */
export function initializeSessionFromStorage(): string | null {
  if (typeof window === "undefined") return null;

  // Check URL first (takes precedence)
  const urlSessionId = getSessionIdFromUrl();
  if (urlSessionId) {
    setCurrentSessionId(urlSessionId);
    return urlSessionId;
  }

  // Check localStorage
  const storedSessionId = getCurrentSessionId();
  if (storedSessionId) {
    setSessionIdInUrl(storedSessionId);
    return storedSessionId;
  }

  return null;
}


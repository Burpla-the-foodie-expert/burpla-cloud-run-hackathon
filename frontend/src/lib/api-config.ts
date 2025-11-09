/**
 * API configuration for backend endpoints
 * The frontend now uses the Python backend API instead of Next.js API routes
 *
 * IMPORTANT: If you set NEXT_PUBLIC_BACKEND_URL, restart your Next.js dev server
 * Environment variables with NEXT_PUBLIC_ prefix are embedded at build time
 */

/**
 * Get the backend API base URL
 * Checks for NEXT_PUBLIC_BACKEND_URL environment variable, defaults to http://localhost:8000
 */
function getBackendBaseUrl(): string {
  // In Next.js, NEXT_PUBLIC_* variables are available on the client
  if (typeof window !== "undefined") {
    // Client-side: use environment variable or default
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}

export const API_CONFIG = {
  // Backend Python API base URL
  get BASE_URL() {
    return getBackendBaseUrl();
  },

  // API endpoints (matching backend FastAPI routes from main.py)
  // All endpoints are now proxied through /api/[...path] catch-all route
  // Backend uses router prefixes: /chat, /session, /user
  ENDPOINTS: {
    // Root and health
    ROOT: "/", // GET - API info and documentation links
    HEALTH: "/health", // GET - Health check endpoint

    // Authentication
    AUTHENTICATION: "/authentication", // POST - Authenticate user by gmail

    // Session management (prefix: /session)
    SESSION_GET_ALL: "/session/get_all", // GET - Get all conversations for a user (requires user_id query param)
    SESSION_GET: "/session/get", // GET - Get conversation session by session_id
    SESSION_GET_USERS_INFO: "/session/get_users_info", // GET - Get all users in a session
    SESSION_CREATE: "/session/create", // POST - Create a new session or join an existing one
    SESSION_UPDATE: "/session/update", // POST - Update session name and/or member list
    SESSION_DELETE: "/session/delete", // DELETE - Delete a conversation session

    // User management (prefix: /user)
    USER_GET: "/user/get", // GET - Get user information by user_id
    USER_UPDATE: "/user/update", // POST - Update user information
    USER_ADD: "/user/add", // POST - Add a new user to the database

    // Chat operations (prefix: /chat)
    CHAT_SENT: "/chat/sent", // POST - Send message to agent and wait for response
    CHAT_VOTE: "/chat/vote", // POST - Record a vote for a restaurant (requires session_id, user_id, message_id, vote_option_id, is_vote_up query params)
    CHAT_CREATE_MARKERS: "/chat/create_markers", // POST - Create map markers for restaurants and users

    // Legacy endpoints (for backward compatibility - deprecated)
    CONVO_INIT: "/session/get_all", // GET - Legacy alias for SESSION_GET_ALL
    GET_SESSION: "/session/get", // GET - Legacy alias for SESSION_GET
    GET_USER_INFO: "/user/get", // GET - Legacy alias for USER_GET
    GET_SESSION_USERS_INFO: "/session/get_users_info", // GET - Legacy alias for SESSION_GET_USERS_INFO
    SENT: "/chat/sent", // POST - Legacy alias for CHAT_SENT
    VOTE: "/chat/vote", // POST - Legacy alias for CHAT_VOTE
    CREATE_MARKERS: "/chat/create_markers", // POST - Legacy alias for CHAT_CREATE_MARKERS
    INIT: "/init", // GET - Legacy endpoint
    CONVO: "/convo", // POST - Legacy endpoint
  },
} as const;

/**
 * Get full API URL for an endpoint (directly to backend)
 * @param endpoint - API endpoint path (e.g., '/sent', '/init')
 * @returns Full URL including backend base URL and endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getBackendBaseUrl();
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Get Next.js API proxy URL for an endpoint
 * This routes through the Next.js API catch-all proxy at /api/[...path]
 * Use this when you want to route through Next.js API routes instead of directly to backend
 * @param endpoint - API endpoint path (e.g., '/sent', '/health')
 * @returns Full URL to Next.js API proxy route
 */
export function getProxyApiUrl(endpoint: string): string {
  // Remove leading slash if present, then add /api prefix
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/api/${cleanEndpoint}`;
}

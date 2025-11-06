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

  // API endpoints (matching backend FastAPI routes)
  ENDPOINTS: {
    SENT: "/sent", // POST - Send message to AI agent
    INIT: "/init", // GET - Get list of conversations
    CONVO: "/convo", // POST - Get conversation by ID
    HEALTH: "/health", // GET - Health check
    ROOT: "/", // GET - API info
  },
} as const;

/**
 * Get full API URL for an endpoint
 * @param endpoint - API endpoint path (e.g., '/sent', '/init')
 * @returns Full URL including backend base URL and endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getBackendBaseUrl();
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

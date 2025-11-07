import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all proxy route that forwards all API requests to the backend FastAPI server
 * This allows the frontend to route all backend endpoints through Next.js API routes
 *
 * Route Priority:
 * - Next.js matches specific routes first (e.g., /api/health/route.ts)
 * - If no specific route matches, this catch-all route proxies to the backend
 * - This allows custom logic for specific endpoints while auto-proxying others
 *
 * Usage:
 * - GET /api/health -> proxies to http://localhost:8000/health (unless /api/health/route.ts exists)
 * - POST /api/sent -> proxies to http://localhost:8000/sent (unless /api/sent/route.ts exists)
 * - GET /api/convo_init?user_id=user_001 -> proxies to http://localhost:8000/convo_init?user_id=user_001
 * - GET /api/get_user_info?user_id=user_001 -> proxies to http://localhost:8000/get_user_info?user_id=user_001
 * - POST /api/vote?session_id=... -> proxies to http://localhost:8000/vote?session_id=...
 * - POST /api/create_markers -> proxies to http://localhost:8000/create_markers
 * - etc.
 *
 * Backend URL is configured via NEXT_PUBLIC_BACKEND_URL environment variable
 * (defaults to http://localhost:8000)
 */

function getBackendBaseUrl(): string {
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}

/**
 * Proxy handler for all HTTP methods
 */
async function handleProxy(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const backendUrl = getBackendBaseUrl();
    const pathSegments = params.path || [];
    const backendPath = `/${pathSegments.join("/")}`;

    // Get query string from request URL
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullBackendUrl = `${backendUrl}${backendPath}${queryString ? `?${queryString}` : ""}`;

    console.log(`[Proxy] ${request.method} ${request.nextUrl.pathname} -> ${fullBackendUrl}`);

    // Get request body if present (for POST, PUT, PATCH)
    let body: BodyInit | undefined;
    const contentType = request.headers.get("content-type") || "";

    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
      // Read body based on content type
      if (contentType.includes("application/json")) {
        try {
          const jsonData = await request.json();
          body = JSON.stringify(jsonData);
        } catch (e) {
          // If JSON parsing fails, body might be empty or malformed
          body = undefined;
        }
      } else if (contentType.includes("multipart/form-data")) {
        body = await request.formData();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        body = await request.text();
      } else if (contentType.includes("text/")) {
        body = await request.text();
      } else {
        // For other content types or no content-type, try arrayBuffer
        try {
          const arrayBuffer = await request.arrayBuffer();
          // Only set body if it's not empty
          if (arrayBuffer.byteLength > 0) {
            body = arrayBuffer;
          }
        } catch (e) {
          // If body is empty or can't be read, leave it undefined
          body = undefined;
        }
      }
    }

    // Forward headers (excluding host and connection)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Skip headers that shouldn't be forwarded
      if (
        !["host", "connection", "content-length"].includes(lowerKey)
      ) {
        headers.set(key, value);
      }
    });

    // Make request to backend
    const response = await fetch(fullBackendUrl, {
      method: request.method,
      headers,
      body,
      // Forward redirects
      redirect: "follow",
    });

    // Get response body
    const responseBody = await response.arrayBuffer();

    // Create response with same status and headers
    const proxyResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Forward response headers (excluding some that shouldn't be forwarded)
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !["content-encoding", "transfer-encoding", "connection"].includes(lowerKey)
      ) {
        proxyResponse.headers.set(key, value);
      }
    });

    return proxyResponse;
  } catch (error: any) {
    console.error(`[Proxy Error] Failed to proxy request:`, error);
    return NextResponse.json(
      {
        error: "Failed to proxy request to backend",
        message: error.message || "Unknown error",
        path: params.path?.join("/"),
      },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;


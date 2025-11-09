import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

// NextAuth v4 route handler for Next.js App Router
// NextAuth v4 returns a handler that works with both Pages Router and App Router
const handler = NextAuth(authOptions);

// For Next.js 15+, we need to handle async params
// However, NextAuth v4 internally accesses params synchronously
// This is a compatibility workaround for Next.js 16 with NextAuth v4
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = await context.params;

    // Create a new context object with resolved params
    // NextAuth v4 expects params to be accessible synchronously
    const resolvedContext = {
      params: resolvedParams,
    };

    // Call the NextAuth handler
    // The handler may return a Promise or Response directly
    const result = handler(req as any, resolvedContext as any);

    // If it's a Promise, await it; otherwise return directly
    if (result instanceof Promise) {
      return await result;
    }
    return result;
  } catch (error) {
    console.error("NextAuth GET error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = await context.params;

    // Create a new context object with resolved params
    // NextAuth v4 expects params to be accessible synchronously
    const resolvedContext = {
      params: resolvedParams,
    };

    // Call the NextAuth handler
    // The handler may return a Promise or Response directly
    const result = handler(req as any, resolvedContext as any);

    // If it's a Promise, await it; otherwise return directly
    if (result instanceof Promise) {
      return await result;
    }
    return result;
  } catch (error) {
    console.error("NextAuth POST error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

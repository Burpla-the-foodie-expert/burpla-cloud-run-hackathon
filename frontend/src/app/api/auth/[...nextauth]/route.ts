import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth v4 route handler for Next.js App Router
// NextAuth v4 returns a handler that works with both Pages Router and App Router
const handler = NextAuth(authOptions);

// Export the handler for both GET and POST
// This is the standard pattern for NextAuth v4 with App Router
export { handler as GET, handler as POST };


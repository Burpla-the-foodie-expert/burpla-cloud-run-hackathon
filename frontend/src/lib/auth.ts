import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Validate required environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Log warnings if environment variables are missing (only in development)
if (process.env.NODE_ENV === "development") {
  if (!googleClientId || !googleClientSecret) {
    console.warn(
      "⚠️  NextAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google sign-in will not work."
    );
  }
  if (!nextAuthSecret) {
    console.warn(
      "⚠️  NextAuth: NEXTAUTH_SECRET is missing. Generate one using: openssl rand -base64 32"
    );
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId || "",
      clientSecret: googleClientSecret || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all Google sign-ins
      return true;
    },
    async session({ session, token }) {
      // Add user ID and email to session
      if (session.user) {
        (session.user as any).id = token.sub || token.id;
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Persist the OAuth access_token and user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error", // Custom error page
  },
  session: {
    strategy: "jwt",
  },
  secret: nextAuthSecret || "fallback-secret-for-development-only",
  debug: process.env.NODE_ENV === "development",
};


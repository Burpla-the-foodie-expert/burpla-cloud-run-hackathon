"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { signIn, useSession } from "next-auth/react";

interface WelcomeScreenProps {
  onComplete: (data: { name: string; location: { lat: number; lng: number } | null; email?: string }) => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { data: session, status } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Check if user is signed in with Google
  useEffect(() => {
    if (session?.user) {
      // User is signed in with Google
      const userName = session.user.name || session.user.email?.split("@")[0] || "User";
      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", session.user.email || "");
      localStorage.setItem("userInitialized", "true");

      // Check for stored location
      const storedLocation = localStorage.getItem("userLocation");
      const location = storedLocation ? JSON.parse(storedLocation) : null;

      // Complete initialization with Google user data
      onComplete({
        name: userName,
        location,
        email: session.user.email || undefined,
      });
    }
  }, [session, onComplete]);



  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // Check if Google OAuth is configured
      const hasGoogleConfig =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        (typeof window !== "undefined" && localStorage.getItem("googleAuthEnabled"));

      if (!hasGoogleConfig) {
        // In production, we can't check env vars on client, so we'll try anyway
        // The error page will handle it gracefully
      }

      await signIn("google", {
        callbackUrl: window.location.href,
        redirect: true,
      });
    } catch (error: any) {
      console.error("Sign in error:", error);
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202225]">
      <div className="w-full max-w-md mx-4">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5865f2] mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to AI Chat
          </h1>
          <p className="text-[#72767d] text-sm">
            Sign in with Google to get started
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#2f3136] rounded-lg border border-[#40444b] p-6">
          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn || status === "loading"}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSigningIn || status === "loading" ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#72767d]">
          Your information is stored locally and never shared without your permission
        </p>
      </div>
    </div>
  );
}


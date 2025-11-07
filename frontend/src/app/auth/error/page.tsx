"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

/**
 * Custom error page for NextAuth authentication errors
 * This page displays user-friendly error messages and provides a way to go back
 */
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");

    // Map NextAuth error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      Configuration: "There is a problem with the server configuration. Please contact support.",
      AccessDenied: "You do not have permission to sign in.",
      Verification: "The verification token has expired or has already been used.",
      OAuthSignin: "Error occurred during OAuth sign-in. Please check your Google OAuth configuration.",
      OAuthCallback: "Error occurred in OAuth callback. The redirect URI may not match your Google Cloud Console settings.",
      OAuthCreateAccount: "Could not create OAuth account. Please try again.",
      EmailCreateAccount: "Could not create email account. Please try again.",
      Callback: "Error in OAuth callback. Check your redirect URI configuration.",
      OAuthAccountNotLinked: "This email is already associated with another account.",
      EmailSignin: "Error sending email. Please try again.",
      CredentialsSignin: "Invalid credentials provided.",
      SessionRequired: "You must be signed in to access this page.",
      Default: "An unexpected error occurred during sign-in. Please try again.",
    };

    if (errorParam) {
      setError(errorMessages[errorParam] || errorMessages.Default);
    } else {
      setError("An unknown error occurred during authentication.");
    }
  }, [searchParams]);

  const handleGoBack = () => {
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202225]">
      <div className="w-full max-w-md mx-4">
        <div className="bg-[#2f3136] rounded-lg border border-[#40444b] p-6 space-y-6">
          {/* Error Icon */}
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#ed4245]/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[#ed4245]" />
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">Authentication Error</h1>
            <p className="text-[#b9bbbe]">{error}</p>
          </div>

          {/* Common Issues */}
          <div className="bg-[#40444b] rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-[#b9bbbe] mb-2">
              Common causes:
            </p>
            <ul className="text-xs text-[#72767d] space-y-1 list-disc list-inside">
              <li>Missing or incorrect Google OAuth credentials</li>
              <li>
                <strong>Redirect URI mismatch:</strong> Make sure Google Cloud Console has exactly:{" "}
                <code className="bg-[#2f3136] px-1 rounded">http://localhost:3000/api/auth/callback/google</code>
              </li>
              <li>Missing NEXTAUTH_SECRET environment variable</li>
              <li>NEXTAUTH_URL not set or incorrect (should be <code className="bg-[#2f3136] px-1 rounded">http://localhost:3000</code>)</li>
              <li>Network or connectivity issues</li>
            </ul>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back to Welcome Screen
          </button>

          {/* Help Text */}
          <p className="text-xs text-center text-[#72767d]">
            If this problem persists, please check your environment variables or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202225]">
        <div className="text-[#b9bbbe]">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}


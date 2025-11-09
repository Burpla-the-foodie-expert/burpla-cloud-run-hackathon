"use client";

import { useState, useEffect, useRef } from "react";
import { SessionProvider } from "next-auth/react";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { Sidebar } from "@/components/ai-elements/sidebar";
import { DiscordChat } from "@/components/ai-elements/discord-chat";
import { GroupChat } from "@/components/ai-elements/group-chat";
import { SessionManager } from "@/components/ai-elements/session-manager";
import { WelcomeScreen } from "@/components/ai-elements/welcome-screen";
import { UsersPanel } from "@/components/ai-elements/users-panel";
import {
  getSessionIdFromUrl,
  setCurrentSessionId,
  setSessionIdInUrl,
  getOrCreateUserId,
  generateUserId,
} from "@/lib/session-utils";
import { getApiUrl } from "@/lib/api-config";
import { Menu, X, Users } from "lucide-react";

interface UserData {
  name: string;
  location: { lat: number; lng: number } | null;
  email?: string;
}

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Initialize sidebar as open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768; // md breakpoint
    }
    return false;
  });
  const [usersPanelOpen, setUsersPanelOpen] = useState(false);
  const initHasRun = useRef(false);

  useEffect(() => {
    if (initHasRun.current) {
      return;
    }
    initHasRun.current = true;

    // Check if user has already initialized
    if (typeof window !== "undefined") {
      // Clean up unwanted query parameters from NextAuth callback
      const url = new URL(window.location.href);
      const hasUnwantedParams =
        url.searchParams.has("callbackUrl") || url.searchParams.has("error");
      const sessionParam = url.searchParams.get("session");

      if (hasUnwantedParams) {
        // Remove unwanted parameters and keep only session if it exists
        url.searchParams.delete("callbackUrl");
        url.searchParams.delete("error");

        // If session exists, ensure it's set correctly
        if (sessionParam) {
          url.searchParams.set("session", sessionParam);
        }

        // Update URL without unwanted parameters
        window.history.replaceState({}, "", url.toString());
      }

      const initialized = localStorage.getItem("userInitialized");
      const userName = localStorage.getItem("userName");
      const userLocation = localStorage.getItem("userLocation");
      const storedUserId = localStorage.getItem("userId");
      const storedSessionId = localStorage.getItem("currentSessionId");
      const userEmail = localStorage.getItem("userEmail");

      // This function will run on mount and handle the entire initialization flow.
      const initializeUserAndSession = async () => {
        try {
          let definitiveUserId: string | null = null;

          // Step 1: ALWAYS try to authenticate with email first if it exists.
          if (userEmail) {
            try {
              const authResponse = await fetch(getApiUrl("/authentication"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  gmail: userEmail,
                  name: userName || undefined,
                }),
              });

              if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.is_authenticated && authData.user_id) {
                  definitiveUserId = authData.user_id; // Canonical ID from backend.
                }
              }
            } catch (error) {
              console.error("Auth failed, will fall back to local user ID.", error);
            }
          }

          // Step 2: If we STILL don't have an ID, fall back to whatever is in storage, or create a new one.
          if (!definitiveUserId) {
            definitiveUserId = getOrCreateUserId();
          }

          // Step 3: Now, set state and storage ONCE with the definitive ID.
          localStorage.setItem("userId", definitiveUserId);
          setUserId(definitiveUserId);

          // Step 4: With the definitive userId, handle the session.
          const urlSessionId = getSessionIdFromUrl();
          if (urlSessionId) {
            setSessionId(urlSessionId);
            setCurrentSessionId(urlSessionId);
          } else if (storedSessionId) {
            setSessionId(storedSessionId);
            setSessionIdInUrl(storedSessionId);
          } else {
            // No session in URL or storage, so we create a new one.
            try {
              const sessionResponse = await fetch(getApiUrl("/session/create"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  owner_id: definitiveUserId,
                  session_name: "New Session",
                  user_id_list: [definitiveUserId],
                }),
              });
              const sessionData = await sessionResponse.json();
              if (sessionData.success && sessionData.session_id) {
                setSessionId(sessionData.session_id);
                setCurrentSessionId(sessionData.session_id);
                setSessionIdInUrl(sessionData.session_id);
              }
            } catch (error) {
              console.error("Failed to auto-create session:", error);
            }
          }
        } catch (e) {
            console.error("A critical error occurred during initialization:", e);
        } finally {
          setIsLoading(false);
        }
      };

      if (initialized === "true" && userName) {
        setUserData({
          name: userName,
          location: userLocation ? JSON.parse(userLocation) : null,
          email: userEmail || undefined,
        });
        setIsInitialized(true);
      }

      initializeUserAndSession();
    }
  }, []);

  const handleWelcomeComplete = (data: UserData) => {
    setUserData(data);
    setIsInitialized(true);
    // Store email if provided
    if (data.email) {
      localStorage.setItem("userEmail", data.email);
    }
  };

  const handleUserUpdate = (data: {
    name: string;
    location: { lat: number; lng: number } | null;
  }) => {
    setUserData({
      name: data.name,
      location: data.location,
      email: userData?.email,
    });
  };

  const handleSessionChange = (id: string) => {
    // Update session ID state
    setSessionId(id);

    // Update localStorage and URL
    setCurrentSessionId(id);
    setSessionIdInUrl(id);

    // Join session if user is initialized
    if (userData && userId) {
      console.log('2222 userId: ', userId)
      fetch(getApiUrl("/session/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: id,
          user_id: userId,
        }),
      }).catch(console.error);
    }
  };

  if (isLoading) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-[#121212]">
        <div className="text-[#9e9e9e]">Loading...</div>
      </main>
    );
  }

  if (!isInitialized) {
    return (
      <SessionProvider>
        <main className="flex h-screen w-screen overflow-hidden">
          <WelcomeScreen onComplete={handleWelcomeComplete} />
        </main>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <ReactQueryProvider>
        <main className="flex h-screen w-screen overflow-hidden relative">
          {/* Mobile overlay */}
          {(sidebarOpen || usersPanelOpen) && (
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => {
                setSidebarOpen(false);
                setUsersPanelOpen(false);
              }}
            />
          )}

          {/* Sidebar - Mobile drawer / Desktop toggleable */}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-full md:w-60 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              userName={userData?.name}
              currentSessionId={sessionId}
              onSessionChange={(id) => {
                handleSessionChange(id);
                setSidebarOpen(false);
              }}
              onUserUpdate={handleUserUpdate}
              userId={userId}
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile header with menu buttons - sticky at top */}
            <div className="md:hidden sticky top-0 z-10 h-12 border-b border-[#333333] flex items-center justify-between px-4 bg-[#1e1e1e]">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
              <div className="text-[#e0e0e0] font-semibold text-sm whitespace-nowrap">
                Burpla
              </div>
              {sessionId && (
                <button
                  onClick={() => setUsersPanelOpen(!usersPanelOpen)}
                  className="p-2 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors flex-shrink-0"
                  aria-label="Toggle users panel"
                >
                  {usersPanelOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            <SessionManager
              sessionId={sessionId}
              userName={userData?.name || "User"}
              userId={userId}
              onSessionChange={handleSessionChange}
            />
            {sessionId && userId ? (
              <GroupChat
                sessionId={sessionId}
                userLocation={userData?.location || null}
                userName={userData?.name || "User"}
                userId={userId}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onToggleUsersPanel={() => setUsersPanelOpen(!usersPanelOpen)}
              />
            ) : userId ? (
              <DiscordChat
                userLocation={userData?.location || null}
                userName={userData?.name || "User"}
                userId={userId}
                sessionId={sessionId || "default"}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[#9e9e9e]">
                Please initialize your account first
              </div>
            )}
          </div>

          {/* Users Panel - Mobile drawer / Desktop toggleable */}
          {sessionId && (
            <div
              className={`fixed inset-y-0 right-0 z-50 w-60 transform transition-transform duration-300 ease-in-out ${
                usersPanelOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <UsersPanel
                sessionId={sessionId}
                currentUserId={userId}
                onClose={() => setUsersPanelOpen(false)}
              />
            </div>
          )}
        </main>
      </ReactQueryProvider>
    </SessionProvider>
  );
}

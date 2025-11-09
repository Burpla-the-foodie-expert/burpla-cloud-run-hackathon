"use client";

import { useState, useEffect, useRef } from "react";
import { Hash, Copy, Check, Users, Hash as HashIcon } from "lucide-react";
import { useSessions } from "@/lib/sessions-query";
import { useSessionManagement } from "@/lib/use-session-management";
import { CreateSessionDialog } from "./create-session-dialog";
import {
  getSessionIdFromUrl,
  initializeSessionFromStorage,
  setCurrentSessionId,
  setSessionIdInUrl,
  copySessionLink as copyLink,
} from "@/lib/session-utils";

interface SessionManagerProps {
  sessionId: string | null;
  userName: string;
  userId: string | null;
  onSessionChange: (sessionId: string) => void;
}

export function SessionManager({
  sessionId,
  userName,
  userId,
  onSessionChange,
}: SessionManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const hasInitializedRef = useRef(false);

  // Get userId from prop or localStorage
  const effectiveUserId =
    userId ||
    (typeof window !== "undefined" ? localStorage.getItem("userId") : null) ||
    "user_001";

  // Fetch available sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isFetched: isSessionsFetched,
  } = useSessions(effectiveUserId);

  // Use session management hook
  const { createSession, joinSession, isCreating } = useSessionManagement({
    onSessionChange,
    userId,
    userName,
  });

  // Initialize session from URL or localStorage on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;

    // Check URL for session ID first
    const urlSessionId = getSessionIdFromUrl();
    if (urlSessionId) {
      setCurrentSessionId(urlSessionId);
      onSessionChange(urlSessionId);
      setShowModal(false);
      hasInitializedRef.current = true;
      return;
    }

    // If we already have a session, don't show modal
    if (sessionId) {
      setShowModal(false);
      hasInitializedRef.current = true;
      return;
    }

    // Check localStorage for existing session
    const storedSessionId = initializeSessionFromStorage();
    if (storedSessionId) {
      onSessionChange(storedSessionId);
      setShowModal(false);
      hasInitializedRef.current = true;
      return;
    }

    // Wait for sessions to be fetched before deciding whether to show modal
    if (!isSessionsFetched || isLoadingSessions) {
      return;
    }

    // Now that sessions are loaded, decide what to do
    hasInitializedRef.current = true;

    if (sessions.length > 0) {
      // Auto-select the first available session
      const firstSession = sessions[0];
      if (firstSession?.session_id) {
        setCurrentSessionId(firstSession.session_id);
        setSessionIdInUrl(firstSession.session_id);
        onSessionChange(firstSession.session_id);
        setShowModal(false);
      }
    } else {
      // No sessions available, show modal
      setShowModal(true);
    }
  }, [
    sessionId,
    isSessionsFetched,
    isLoadingSessions,
    sessions,
    onSessionChange,
  ]);

  // Update modal state when session changes
  useEffect(() => {
    if (sessionId) {
      setShowModal(false);
    } else if (isSessionsFetched && !isLoadingSessions && sessions.length === 0) {
      setShowModal(true);
    }
  }, [sessionId, isSessionsFetched, isLoadingSessions, sessions.length]);

  const handleCreateSession = async (sessionName: string) => {
    try {
      await createSession(sessionName);
      setShowCreateDialog(false);
      setShowModal(false);
    } catch (error) {
      // Error is handled by CreateSessionDialog
      throw error;
    }
  };

  const handleJoinSession = async () => {
    if (!newSessionId.trim()) return;

    try {
      await joinSession(newSessionId.trim());
      setShowModal(false);
      setNewSessionId("");
    } catch (error) {
      console.error("Failed to join session:", error);
      alert("Failed to join session. Please check the session ID and try again.");
    }
  };

  const handleCopySessionLink = async () => {
    if (!sessionId) return;
    try {
      await copyLink(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };


  // Show session info bar when session is active (mobile only - desktop uses GroupChat header)
  // Fixed below the main mobile header, always shows full information
  if (!showModal && sessionId) {
    // Get session name from sessions query
    const currentSession = sessions?.find((s) => s.session_id === sessionId);
    const sessionName = currentSession?.session_name || sessionId;

    return (
      <div className="md:hidden h-12 border-b border-[#333333] flex items-center justify-between px-2 md:px-4 bg-[#1e1e1e]">
        <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0 overflow-hidden">
          <Hash className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
          <span className="text-xs md:text-sm text-[#e0e0e0] truncate min-w-0">
            {sessionName}
          </span>
        </div>
        <button
          onClick={handleCopySessionLink}
          className="flex items-center gap-1 px-2 py-1.5 md:py-1 text-xs text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors touch-manipulation flex-shrink-0 whitespace-nowrap ml-2"
          title="Copy session link"
          aria-label="Copy session link"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 md:w-3 md:h-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 md:w-3 md:h-3" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Show join/create modal when no session is active
  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full border border-[#333333] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#333333]">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#9c27b0] flex items-center justify-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <h2 className="text-base md:text-lg font-semibold text-[#e0e0e0]">
                  Start Session
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-4">
              <p className="text-[#9e9e9e] text-xs md:text-sm">
                Create a new group chat session or join an existing one.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-3 bg-[#9c27b0] hover:bg-[#7b1fa2] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm md:text-base"
                >
                  Create New Session
                </button>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HashIcon className="w-4 h-4 md:w-5 md:h-5 text-[#9e9e9e]" />
                  </div>
                  <input
                    type="text"
                    value={newSessionId}
                    onChange={(e) => setNewSessionId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSessionId.trim()) {
                        handleJoinSession();
                      }
                    }}
                    placeholder="Enter session ID to join"
                    className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-[#1e1e1e] border border-[#333333] rounded-lg text-[#e0e0e0] placeholder-[#9e9e9e] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] focus:border-transparent transition-all font-mono text-xs md:text-sm"
                  />
                </div>

                <button
                  onClick={handleJoinSession}
                  disabled={!newSessionId.trim() || isCreating}
                  className="w-full px-4 py-2.5 md:py-3 bg-[#333333] hover:bg-[#2a2a2a] text-[#e0e0e0] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm md:text-base"
                >
                  Join Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateSession}
      />
    </>
  );
}


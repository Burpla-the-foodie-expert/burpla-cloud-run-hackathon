"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Hash, Copy, Check } from "lucide-react";

interface SessionManagerProps {
  sessionId: string | null;
  userName: string;
  onSessionChange: (sessionId: string) => void;
}

export function SessionManager({
  sessionId,
  userName,
  onSessionChange,
}: SessionManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check URL for session ID
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSessionId = params.get("session");

      if (urlSessionId) {
        onSessionChange(urlSessionId);
      } else if (!sessionId) {
        // Check localStorage for existing session
        const storedSessionId = localStorage.getItem("currentSessionId");
        if (storedSessionId) {
          onSessionChange(storedSessionId);
          // Update URL
          const url = new URL(window.location.href);
          url.searchParams.set("session", storedSessionId);
          window.history.replaceState({}, "", url.toString());
        } else {
          // No session ID, show modal
          setShowModal(true);
        }
      }
    }
  }, [onSessionChange, sessionId]);

  const createSession = async () => {
    const id = `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`;

    // Create session on backend
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", sessionId: id }),
      });
    } catch (error) {
      console.error("Failed to create session:", error);
    }

    // Store in localStorage
    localStorage.setItem("currentSessionId", id);
    onSessionChange(id);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("session", id);
    window.history.replaceState({}, "", url.toString());

    setShowModal(false);
  };

  const joinSession = async () => {
    if (newSessionId.trim()) {
      const sessionIdToJoin = newSessionId.trim();

      // Join session on backend
      try {
        const userId = localStorage.getItem("userId") || generateId();
        localStorage.setItem("userId", userId);

        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "join",
            sessionId: sessionIdToJoin,
            userId,
            userName,
          }),
        });
      } catch (error) {
        console.error("Failed to join session:", error);
      }

      // Store in localStorage
      localStorage.setItem("currentSessionId", sessionIdToJoin);
      onSessionChange(sessionIdToJoin);

      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("session", sessionIdToJoin);
      window.history.replaceState({}, "", url.toString());

      setShowModal(false);
      setNewSessionId("");
    }
  };

  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const copySessionLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("session", sessionId || "");
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  if (!showModal && sessionId) {
    return (
      <div className="h-12 border-b border-[#333333] flex items-center justify-between px-4 bg-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-[#9e9e9e]" />
          <span className="text-sm text-[#9e9e9e]">Session:</span>
          <span className="text-sm font-mono text-[#e0e0e0]">{sessionId}</span>
        </div>
        <button
          onClick={copySessionLink}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors"
          title="Copy session link"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy Link
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[#333333]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333333]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#9c27b0] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-[#e0e0e0]">
                  {sessionId ? "Join Session" : "Start Session"}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-[#9e9e9e] text-sm">
                {sessionId
                  ? "Join an existing chat session by entering the session ID, or create a new one."
                  : "Create a new group chat session or join an existing one."}
              </p>

              <div className="space-y-3">
                <button
                  onClick={createSession}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#9c27b0] hover:bg-[#7b1fa2] text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create New Session
                </button>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="w-5 h-5 text-[#9e9e9e]" />
                  </div>
                  <input
                    type="text"
                    value={newSessionId}
                    onChange={(e) => setNewSessionId(e.target.value)}
                    placeholder="Enter session ID to join"
                    className="w-full pl-10 pr-4 py-3 bg-[#1e1e1e] border border-[#333333] rounded-lg text-[#e0e0e0] placeholder-[#9e9e9e] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] focus:border-transparent transition-all font-mono text-sm"
                  />
                </div>

                <button
                  onClick={joinSession}
                  disabled={!newSessionId.trim()}
                  className="w-full px-4 py-3 bg-[#333333] hover:bg-[#2a2a2a] text-[#e0e0e0] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


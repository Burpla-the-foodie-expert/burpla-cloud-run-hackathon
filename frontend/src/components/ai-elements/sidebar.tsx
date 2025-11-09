"use client";

import {
  Hash,
  Settings,
  MapPin,
  LogOut,
  Trash2,
  X,
  Edit2,
  Check,
  X as XIcon,
  Search,
  ArrowUpDown,
  Plus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { getApiUrl } from "@/lib/api-config";
import { UserSettingsDialog } from "./user-settings-dialog";
import { getRandomFoodTopic } from "@/lib/food-topics";
import {
  useSessions,
  useUpdateSessionName,
  type Session,
} from "@/lib/sessions-query";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionManagement } from "@/lib/use-session-management";
import {
  setCurrentSessionId,
  setSessionIdInUrl,
  removeCurrentSessionId,
  removeSessionIdFromUrl,
} from "@/lib/session-utils";

interface SidebarProps {
  userName?: string;
  currentSessionId?: string | null;
  userId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  onUserUpdate?: (data: {
    name: string;
    location: { lat: number; lng: number } | null;
  }) => void;
  onClose?: () => void;
}

export function Sidebar({
  userName,
  currentSessionId,
  userId,
  onSessionChange,
  onUserUpdate,
  onClose,
}: SidebarProps) {
  const { data: session } = useSession();
  const [hasLocation, setHasLocation] = useState(false);
  const [displayName, setDisplayName] = useState("User");
  const [showSettings, setShowSettings] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"lastUpdated" | "name">("lastUpdated");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const hasCheckedSessionsRef = useRef(false);

  // Use React Query to fetch sessions
  const {
    data: sessions = [],
    isLoading,
    isFetched,
    refetch: refetchSessions,
  } = useSessions(userId || null); // ALWAYS use the userId from props, fallback to null

  // Mutations for updating sessions
  const updateSessionNameMutation = useUpdateSessionName();
  const queryClient = useQueryClient();

  // Use session management hook
  const { createSession } = useSessionManagement({
    onSessionChange,
    userId: userId || null, // ALWAYS use the userId from props, fallback to null
    userName: displayName,
  });

  useEffect(() => {
    const location = localStorage.getItem("userLocation");
    setHasLocation(!!location);

    // Use session user name if available, otherwise fall back to localStorage or prop
    if (session?.user?.name) {
      setDisplayName(session.user.name);
    } else {
      const storedName = localStorage.getItem("userName");
      if (storedName) {
        setDisplayName(storedName);
      } else if (userName) {
        setDisplayName(userName);
      }
    }
  }, [userName, session]);

  // Check if user has no sessions on initial load and show form
  // Only check once on initial mount, not during refetches after deletions
  useEffect(() => {
    // Only check when data has been fetched (isFetched), not loading, and haven't checked before
    // isFetched ensures the query has completed at least once, so sessions data is available
    if (isFetched && !isLoading && !hasCheckedSessionsRef.current) {
      hasCheckedSessionsRef.current = true;
      // Only show form if there are truly no sessions (initial state)
      if (sessions.length === 0) {
        // Show form after a short delay to ensure UI is ready
        setTimeout(() => {
          setShowCreateForm(true);
          setNewSessionName(getRandomFoodTopic());
        }, 300);
      }
    }
  }, [isFetched, isLoading, sessions.length]);

  const handleSessionClick = (sessionId: string) => {
    // Update localStorage and URL
    setCurrentSessionId(sessionId);
    setSessionIdInUrl(sessionId);

    // Notify parent component
    if (onSessionChange) {
      onSessionChange(sessionId);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.error("User ID not found");
        return;
      }

      // Call backend API to delete session
      const backendUrl = getApiUrl(
        `/session/delete?session_id=${encodeURIComponent(
          sessionId
        )}&user_id=${encodeURIComponent(userId)}`
      );
      const response = await fetch(backendUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Invalidate sessions query to refetch updated list
        queryClient.invalidateQueries({ queryKey: ["sessions", userId] });

        // If deleted session was the current one, clear it
        if (currentSessionId === sessionId) {
          removeCurrentSessionId();
          removeSessionIdFromUrl();
          if (onSessionChange) {
            onSessionChange("");
          }
        }

        // Clear message cache for this session
        const { clearCache } = await import("@/lib/message-cache");
        clearCache(sessionId);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || "Failed to delete session");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session. Please try again.");
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const handleStartEditSessionName = (session: Session) => {
    setEditingSessionId(session.session_id);
    setEditingSessionName(session.session_name || session.session_id);
  };

  const handleCancelEditSessionName = () => {
    setEditingSessionId(null);
    setEditingSessionName("");
  };

  const handleSaveSessionName = async (sessionId: string) => {
    if (!editingSessionName.trim()) {
      alert("Session name cannot be empty");
      return;
    }

    try {
      await updateSessionNameMutation.mutateAsync({
        sessionId,
        sessionName: editingSessionName.trim(),
      });
      setEditingSessionId(null);
      setEditingSessionName("");
    } catch (error: any) {
      console.error("Failed to update session name:", error);
      alert(
        error.message || "Failed to update session name. Please try again."
      );
    }
  };

  const handleCreateSession = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!newSessionName.trim()) {
      setCreateError("Please enter a session name");
      return;
    }

    if (isCreating || !userId) return; // Add guard to prevent creation if userId is not ready

    setIsCreating(true);
    setCreateError(null);

    try {
      const sessionName = newSessionName.trim();
      // Use the session management hook which handles all the logic
      await createSession(sessionName);

      // Reset form after successful creation
      setNewSessionName("");
      setShowCreateForm(false);
      setCreateError(null);
    } catch (error: any) {
      console.error("Failed to create session:", error);
      setCreateError(
        error.message || "Failed to create session. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleCreateForm = () => {
    if (showCreateForm) {
      // Close form
      setShowCreateForm(false);
      setNewSessionName("");
      setCreateError(null);
    } else {
      // Open form
      setShowCreateForm(true);
      setNewSessionName(getRandomFoodTopic());
      setCreateError(null);
    }
  };

  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");

    // Clear user from server-side sessions
    if (userId) {
      // try {
      //   await fetch(getApiUrl("/sessions"), {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ action: "logout", userId }),
      //   });
      // } catch (error) {
      //   console.error("Failed to logout from sessions:", error);
      //   // Continue with logout even if API call fails
      // }
    }

    // Clear all local storage data
    localStorage.removeItem("userInitialized");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userLocation");
    localStorage.removeItem("userId");
    removeCurrentSessionId();

    // Clear session from URL
    removeSessionIdFromUrl();

    // Sign out from NextAuth if signed in
    if (session) {
      await signOut({ callbackUrl: window.location.origin });
    } else {
      // If not signed in with NextAuth, just reload to show welcome screen
      window.location.href = window.location.origin;
    }
  };

  // Filter and sort sessions
  const filteredAndSortedSessions = sessions
    .filter((session) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const sessionName = (
        session.session_name || session.session_id
      ).toLowerCase();
      return sessionName.includes(query);
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        // Sort alphabetically by name
        const nameA = (a.session_name || a.session_id).toLowerCase();
        const nameB = (b.session_name || b.session_id).toLowerCase();
        return nameA.localeCompare(nameB);
      } else {
        // Sort by last_updated descending (most recent first) - default
        const dateA = new Date(a.last_updated || a.created_date || 0).getTime();
        const dateB = new Date(b.last_updated || b.created_date || 0).getTime();
        return dateB - dateA;
      }
    });

  return (
    <>
      <div className="w-full md:w-60 bg-[#1e1e1e] flex flex-col h-screen border-r border-[#333333] max-w-sm md:max-w-none">
        {/* Server header */}
        <div className="h-12 border-b border-[#333333] flex items-center justify-between px-3 md:px-4 shadow-sm bg-[#2a2a2a]">
          <div className="text-[#e0e0e0] font-semibold text-base">Burpla</div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors touch-manipulation"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-2 md:px-2 py-3 md:py-4">
          <div className="px-2 mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wide px-2">
              Sessions
            </div>
            <button
              onClick={handleToggleCreateForm}
              className="p-1.5 md:p-1 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors touch-manipulation"
              title="Create new session"
              aria-label="Create new session"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Create Session Form */}
          {showCreateForm && (
            <div className="px-2 mb-3">
              <form
                onSubmit={handleCreateSession}
                className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => {
                      setNewSessionName(e.target.value);
                      setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        handleToggleCreateForm();
                      }
                    }}
                    placeholder="Enter session name"
                    className="flex-1 bg-[#1e1e1e] border border-[#333333] rounded px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#9e9e9e] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] focus:border-transparent"
                    maxLength={100}
                    autoFocus
                    disabled={isCreating}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isCreating || !newSessionName.trim() || !userId} // Disable if userId is null
                    className="px-3 py-2 bg-[#9c27b0] hover:bg-[#7b1fa2] text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center gap-1.5"
                    title={!userId ? "Authenticating..." : "Create session"}
                  >
                    {isCreating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Create</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleCreateForm}
                    disabled={isCreating}
                    className="p-2 text-[#9e9e9e] hover:text-[#e0e0e0] hover:bg-[#333333] rounded transition-colors disabled:opacity-50 touch-manipulation"
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {createError ? (
                      <p className="text-xs text-[#ed4245] truncate">
                        {createError}
                      </p>
                    ) : (
                      <p className="text-xs text-[#9e9e9e]">
                        {newSessionName.length}/100 characters
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSessionName(getRandomFoodTopic());
                      setCreateError(null);
                    }}
                    className="text-xs text-[#9c27b0] hover:text-[#7b1fa2] transition-colors ml-2 flex-shrink-0"
                    disabled={isCreating}
                  >
                    Random name
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search and Sort Controls */}
          {!isLoading && sessions.length > 0 && (
            <div className="px-2 mb-3 md:mb-2 space-y-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9e9e9e]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full pl-8 pr-2 py-2 md:py-1.5 text-sm bg-[#2a2a2a] border border-[#333333] rounded text-[#e0e0e0] placeholder-[#9e9e9e] focus:outline-none focus:border-[#9c27b0]"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "lastUpdated" | "name")
                  }
                  className="w-full pl-8 pr-8 py-2 md:py-1.5 text-sm bg-[#2a2a2a] border border-[#333333] rounded text-[#e0e0e0] focus:outline-none focus:border-[#9c27b0] appearance-none cursor-pointer"
                >
                  <option value="lastUpdated">Last Updated</option>
                  <option value="name">Name (A-Z)</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9e9e9e] pointer-events-none" />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="px-2 py-4 text-center">
              <div className="text-xs text-[#9e9e9e]">Loading sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <div className="text-xs text-[#9e9e9e] mb-2">
                No sessions found
              </div>
            </div>
          ) : filteredAndSortedSessions.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <div className="text-xs text-[#9e9e9e] mb-2">
                No sessions match your search
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 md:space-y-1">
              {filteredAndSortedSessions.map((session) => {
                const isSelected = currentSessionId === session.session_id;
                const sessionName = session.session_name || session.session_id;
                const isEditing = editingSessionId === session.session_id;

                return (
                  <div
                    key={session.session_id}
                    className={`group relative flex items-center gap-2 mb-0 md:mb-1 rounded ${
                      isSelected ? "bg-[#9c27b0]" : ""
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 px-2 py-2 rounded text-sm bg-[#333333]">
                        <input
                          type="text"
                          value={editingSessionName}
                          onChange={(e) =>
                            setEditingSessionName(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveSessionName(session.session_id);
                            } else if (e.key === "Escape") {
                              handleCancelEditSessionName();
                            }
                          }}
                          className="flex-1 bg-transparent text-[#e0e0e0] outline-none border-b border-[#9c27b0] focus:border-[#9c27b0]"
                          autoFocus
                          disabled={updateSessionNameMutation.isPending}
                        />
                        <button
                          onClick={() =>
                            handleSaveSessionName(session.session_id)
                          }
                          disabled={updateSessionNameMutation.isPending}
                          className="p-1 text-[#4caf50] hover:text-[#66bb6a] disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditSessionName}
                          disabled={updateSessionNameMutation.isPending}
                          className="p-1 text-[#9e9e9e] hover:text-[#e0e0e0] disabled:opacity-50"
                          title="Cancel"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSessionClick(session.session_id)}
                          className={`flex-1 flex items-center gap-2 px-3 md:px-2 py-3 md:py-2 rounded text-sm transition-colors touch-manipulation ${
                            isSelected
                              ? "bg-[#9c27b0] text-white"
                              : "text-[#9e9e9e] hover:bg-[#333333] hover:text-[#e0e0e0] active:bg-[#333333]"
                          }`}
                          title={session.session_id}
                        >
                          <Hash className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium truncate flex-1 text-left">
                            {sessionName}
                          </span>
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditSessionName(session);
                            }}
                            className={`p-2 md:p-1.5 rounded transition-colors touch-manipulation ${
                              isSelected
                                ? "text-white/70 hover:text-white hover:bg-[#9c27b0]/80"
                                : "text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            }`}
                            title="Edit session name"
                            aria-label="Edit session name"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session.session_id);
                            }}
                            className={`p-2 md:p-1.5 rounded transition-colors touch-manipulation ${
                              isSelected
                                ? "text-white/70 hover:text-white hover:bg-[#9c27b0]/80"
                                : "text-[#9e9e9e] hover:text-[#ed4245] hover:bg-[#333333] opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            }`}
                            title="Delete session"
                            aria-label="Delete session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {sessionToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-[#e0e0e0] mb-2">
                Delete Session
              </h3>
              <p className="text-[#9e9e9e] mb-6">
                Are you sure you want to delete this session? This action cannot
                be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setSessionToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-[#9e9e9e] hover:text-[#e0e0e0] hover:bg-[#333333] rounded transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSession(sessionToDelete)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-[#ed4245] text-white rounded hover:bg-[#c03537] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User section */}
        <div className="h-14 bg-[#2a2a2a] border-t border-[#333333] flex items-center px-2 md:px-2">
          <div className="flex items-center gap-2 md:gap-3 px-2 py-1.5 rounded hover:bg-[#333333] rounded cursor-pointer flex-1">
            <div className="w-8 h-8 rounded-full bg-[#9c27b0] flex items-center justify-center text-white text-sm font-medium">
              {displayName.length > 2
                ? displayName.substring(0, 2).toUpperCase()
                : displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#e0e0e0] truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#9e9e9e]">
                  {session?.user?.email ? "Signed in" : "Online"}
                </span>
                {hasLocation && (
                  <span className="text-xs text-[#4caf50] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Located
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 md:p-1 text-[#9e9e9e] hover:text-[#9c27b0] touch-manipulation"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 md:w-4 md:h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 md:p-1 text-[#9e9e9e] hover:text-[#ed4245] touch-manipulation"
                title={session ? "Sign out" : "Log out"}
                aria-label={session ? "Sign out" : "Log out"}
              >
                <LogOut className="w-4 h-4 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* User Settings Dialog */}
        <UserSettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onUpdate={(data) => {
            // Update local state
            setDisplayName(data.name);
            setHasLocation(!!data.location);

            // Notify parent component
            if (onUserUpdate) {
              onUserUpdate(data);
            }

            // Refresh display
            const location = localStorage.getItem("userLocation");
            setHasLocation(!!location);
          }}
        />
      </div>
    </>
  );
}

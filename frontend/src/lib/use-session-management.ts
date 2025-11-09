/**
 * Custom hook for session management operations
 * Consolidates session creation, joining, and state management
 */

import { useQueryClient } from "@tanstack/react-query";
import {
  generateSessionId,
  setCurrentSessionId,
  setSessionIdInUrl,
  getOrCreateUserId,
  getUserName,
} from "@/lib/session-utils";
import { useCreateSession } from "./sessions-query";
import { useCallback } from "react";
import { getApiUrl } from "./api-config";

interface UseSessionManagementOptions {
  onSessionChange?: (sessionId: string) => void;
  userId: string | null;
  userName: string | null;
}

export function useSessionManagement({
  onSessionChange,
  userId,
  userName,
}: UseSessionManagementOptions) {
  const queryClient = useQueryClient();
  const createSessionMutation = useCreateSession();

  const createSession = useCallback(
    async (sessionName: string) => {
      // Always use the latest userId from props, do not fall back to getOrCreateUserId here.
      // The button in the UI should be disabled if userId is not available.
      if (!userId) {
        console.error("Create session called without a userId.");
        // Optionally, throw an error or return early
        throw new Error("User is not authenticated, cannot create session.");
      }

      const effectiveUserName = userName || "User";

      try {
        const newSession = await createSessionMutation.mutateAsync({
          owner_id: userId,
          userName: effectiveUserName,
          session_name: sessionName,
        });

        // After successful creation, trigger session change
        if (newSession.session_id && onSessionChange) {
          onSessionChange(newSession.session_id);
        }

        return newSession;
      } catch (error) {
        console.error("Failed to create session:", error);
        throw error; // Re-throw to be caught by the component
      }
    },
    [userId, userName, createSessionMutation, onSessionChange, queryClient]
  );

  const joinSession = useCallback(
    async (sessionIdToJoin: string) => {
      if (!userId) {
        console.error("Join session called without a userId.");
        throw new Error("User is not authenticated, cannot join session.");
      }

      try {
        // First, join the session on the backend
        const response = await fetch(getApiUrl("/session/join"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdToJoin.trim(),
            user_id: userId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to join session");
        }

        // Invalidate sessions query to refetch and show the newly joined session
        queryClient.invalidateQueries({
          queryKey: ["sessions", userId],
        });

        // Update localStorage and URL
        setCurrentSessionId(sessionIdToJoin);
        setSessionIdInUrl(sessionIdToJoin);

        // Notify parent component
        if (onSessionChange) {
          onSessionChange(sessionIdToJoin);
        }
      } catch (error) {
        console.error("Failed to join session:", error);
        throw error;
      }
    },
    [userId, onSessionChange, queryClient]
  );

  return { createSession, joinSession };
}

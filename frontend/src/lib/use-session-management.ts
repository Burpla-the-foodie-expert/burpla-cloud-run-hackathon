/**
 * Custom hook for session management operations
 * Consolidates session creation, joining, and state management
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateSession } from "@/lib/sessions-query";
import {
  generateSessionId,
  getOrCreateUserId,
  getUserName,
  setCurrentSessionId,
  setSessionIdInUrl,
} from "@/lib/session-utils";

interface UseSessionManagementOptions {
  onSessionChange?: (sessionId: string) => void;
  userId?: string | null;
  userName?: string;
}

/**
 * Hook for managing session operations
 */
export function useSessionManagement({
  onSessionChange,
  userId,
  userName,
}: UseSessionManagementOptions = {}) {
  const createSessionMutation = useCreateSession();
  const queryClient = useQueryClient();

  /**
   * Create a new session
   */
  const createSession = useCallback(
    async (sessionName: string): Promise<string> => {
      const effectiveUserId = userId || getOrCreateUserId();
      const effectiveUserName = userName || getUserName();
      const newSessionId = generateSessionId();

      try {
        // Use React Query mutation for optimistic update
        const result = await createSessionMutation.mutateAsync({
          sessionId: newSessionId,
          userId: effectiveUserId,
          userName: effectiveUserName,
          sessionName: sessionName.trim(),
        });

        // Use the sessionId from the response (backend might return a different one)
        const finalSessionId = result.sessionId || newSessionId;

        // Update localStorage and URL
        setCurrentSessionId(finalSessionId);
        setSessionIdInUrl(finalSessionId);

        // Notify parent component
        if (onSessionChange) {
          onSessionChange(finalSessionId);
        }

        return finalSessionId;
      } catch (error) {
        console.error("Failed to create session:", error);
        throw error;
      }
    },
    [userId, userName, onSessionChange, createSessionMutation]
  );

  /**
   * Join an existing session
   */
  const joinSession = useCallback(
    async (sessionIdToJoin: string): Promise<void> => {
      const effectiveUserId = userId || getOrCreateUserId();
      const effectiveUserName = userName || getUserName();

      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "join",
            sessionId: sessionIdToJoin.trim(),
            userId: effectiveUserId,
            userName: effectiveUserName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to join session");
        }

        // Invalidate sessions query to refetch and show the newly joined session
        queryClient.invalidateQueries({ queryKey: ["sessions", effectiveUserId] });

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
    [userId, userName, onSessionChange, queryClient]
  );

  return {
    createSession,
    joinSession,
    isCreating: createSessionMutation.isPending,
  };
}


"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api-config";
import { generateSessionId } from "./session-utils";

export interface Session {
  session_id: string;
  session_name: string;
  owner_id: string;
  member_id_list: string;
  last_updated: string;
  created_date: string;
}

/**
 * Fetch all sessions for a user
 */
async function fetchSessions(userId: string): Promise<Session[]> {
  console.log("1111 userId: ", userId);
  const backendUrl = getApiUrl(
    `/session/get_all?user_id=${encodeURIComponent(userId)}`
  );
  const response = await fetch(backendUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sessions");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Create a new session
 */
async function createSession(params: {
  // sessionId: string; // The backend will generate the session_id
  owner_id: string; // Renamed from userId to match backend model
  userName: string;
  session_name: string; // Renamed from sessionName
}) {
  const response = await fetch(getApiUrl("/session/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner_id: params.owner_id,
      session_name: params.session_name,
      user_id_list: [params.owner_id], // Create session with owner as the first member
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create session");
  }

  const data = await response.json();
  return data;
}

/**
 * Update session name
 */
async function updateSessionName(params: {
  sessionId: string;
  sessionName: string;
}): Promise<void> {
  const backendUrl = getApiUrl("/session/update");
  const response = await fetch(backendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: params.sessionId,
      session_name: params.sessionName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || errorData.error || "Failed to update session name"
    );
  }
}

/**
 * Hook to fetch sessions for a user
 */
export function useSessions(userId: string | null) {
  return useQuery({
    queryKey: ["sessions", userId],
    queryFn: () => fetchSessions(userId || "user_001"),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to create a new session with optimistic updates
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSession,
    onMutate: async (newSession) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["sessions", newSession.owner_id],
      });

      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData<Session[]>([
        "sessions",
        newSession.owner_id,
      ]);

      // Optimistically update to the new value
      const optimisticSession: Session = {
        session_id: generateSessionId(),
        session_name: newSession.session_name,
        owner_id: newSession.owner_id,
        member_id_list: newSession.owner_id,
        last_updated: new Date().toISOString(),
        created_date: new Date().toISOString(),
      };

      queryClient.setQueryData<Session[]>(
        ["sessions", newSession.owner_id],
        (old = []) => {
          // Add new session at the beginning (most recent first)
          return [optimisticSession, ...old];
        }
      );

      // Return a context object with the snapshotted value
      return {
        previousSessions,
        optimisticSessionId: optimisticSession.session_id,
      };
    },
    onError: (err, newSession, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSessions) {
        queryClient.setQueryData(
          ["sessions", newSession.owner_id],
          context.previousSessions
        );
      }
    },
    onSuccess: (data, variables, context) => {
      // If backend returned a different session_id, update the optimistic session
      if (data.sessionId && data.sessionId !== context?.optimisticSessionId) {
        queryClient.setQueryData<Session[]>(
          ["sessions", variables.owner_id],
          (old = []) => {
            return old.map((session) =>
              session.session_id === context?.optimisticSessionId
                ? { ...session, session_id: data.sessionId }
                : session
            );
          }
        );
      }
      // Invalidate and refetch to get the actual session from backend
      queryClient.invalidateQueries({
        queryKey: ["sessions", variables.owner_id],
      });
    },
  });
}

/**
 * Hook to update session name with optimistic updates
 */
export function useUpdateSessionName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSessionName,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["sessions"] });

      // We need to find which user's sessions to update
      // Get all session queries
      const queryCache = queryClient.getQueryCache();
      const sessionQueries = queryCache.findAll({ queryKey: ["sessions"] });

      // Snapshot previous values for all session queries
      const previousSessionsMap = new Map<string, Session[]>();
      sessionQueries.forEach((query) => {
        const userId = query.queryKey[1] as string;
        const previousSessions = queryClient.getQueryData<Session[]>([
          "sessions",
          userId,
        ]);
        if (previousSessions) {
          previousSessionsMap.set(userId, previousSessions);
        }
      });

      // Optimistically update all session queries
      sessionQueries.forEach((query) => {
        const userId = query.queryKey[1] as string;
        queryClient.setQueryData<Session[]>(
          ["sessions", userId],
          (old = []) => {
            return old.map((session) =>
              session.session_id === variables.sessionId
                ? { ...session, session_name: variables.sessionName }
                : session
            );
          }
        );
      });

      return { previousSessionsMap };
    },
    onError: (err, variables, context) => {
      // Roll back all queries
      if (context?.previousSessionsMap) {
        context.previousSessionsMap.forEach((previousSessions, userId) => {
          queryClient.setQueryData(["sessions", userId], previousSessions);
        });
      }
    },
    onSuccess: () => {
      // Invalidate and refetch all session queries
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

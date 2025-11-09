"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  Send,
  Hash,
  User,
  ChevronDown,
  Menu,
  Users,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { UserMessage } from "./user-message";
import { BotMessage } from "./bot-message";
import { InteractiveCard } from "./interactive-card";
import type { InteractiveCardConfig } from "./interactive-card";
import {
  convertConvoMessagesToGroupChatMessages,
  extractUsersFromConvoMessages,
  parseMessageForCard,
  type ConvoMessage,
} from "@/lib/conversation-utils";
import {
  subscribeToMessages,
  refreshMessages,
  clearCache,
  setUserTyping,
  addMessageToCache,
  type CachedMessage,
} from "@/lib/message-cache";
import { getApiUrl } from "@/lib/api-config";
import { copySessionLink } from "@/lib/session-utils";
import { useSessions } from "@/lib/sessions-query";

function getAvatarColor(name: string) {
  const colors = [
    "#5865f2",
    "#57f287",
    "#fee75c",
    "#ed4245",
    "#eb459e",
    "#f37b5c",
    "#ff7b85",
    "#5865f2",
    "#57f287",
    "#fee75c",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: InteractiveCardConfig; // Optional card data
}

interface MessageGroup {
  userId: string;
  userName: string;
  messages: Array<Message>;
  avatar: string;
  avatarColor: string;
}

interface SessionUser {
  id: string;
  name: string;
  joinedAt: number;
}

interface MentionOption {
  id: string;
  name: string;
  isBot: boolean;
}

interface GroupChatProps {
  sessionId: string;
  userLocation?: { lat: number; lng: number } | null;
  userName: string;
  userId: string;
  initialMessages?: Message[];
  initialUsers?: SessionUser[];
  // Support for convo_sample.json format
  convoData?: ConvoMessage[];
  loadFromConvo?: boolean; // If true, will load and convert convo data
  onToggleSidebar?: () => void;
  onToggleUsersPanel?: () => void;
}

export function GroupChat({
  sessionId,
  userLocation,
  userName,
  userId,
  initialMessages,
  initialUsers,
  convoData,
  loadFromConvo = false,
  onToggleSidebar,
  onToggleUsersPanel,
}: GroupChatProps) {
  // Get session name from sessions query
  const { data: sessions = [] } = useSessions(userId);
  const currentSession = sessions.find((s) => s.session_id === sessionId);
  const sessionName = currentSession?.session_name || sessionId;

  // Initialize messages from either initialMessages or convoData
  const initializeMessages = () => {
    if (loadFromConvo && convoData) {
      return convertConvoMessagesToGroupChatMessages(convoData);
    }
    return initialMessages || [];
  };

  const [messages, setMessages] = useState<Message[]>(initializeMessages());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false); // Prevent duplicate sends

  // Initialize users from either initialUsers or extracted from convoData
  const initializeUsers = () => {
    if (loadFromConvo && convoData) {
      return extractUsersFromConvoMessages(convoData);
    }
    return initialUsers || [];
  };

  const [sessionUsers, setSessionUsers] = useState<SessionUser[]>(
    initializeUsers()
  );
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autoMentionBurpla, setAutoMentionBurpla] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const previousRecommendationCardCountRef = useRef<number>(0);

  // Subscribe to cached messages (shared across components)
  useEffect(() => {
    if (!sessionId) {
      // Clear messages when sessionId is null
      setMessages([]);
      setSessionUsers([]);
      return;
    }

    // Clear messages and cache when switching sessions to prevent showing old messages
    setMessages([]);
    setSessionUsers([]);
    // Clear the cache for the previous session (if any) to ensure fresh data
    // The cache will be recreated when we subscribe below

    const handleMessagesUpdate = (cachedMessages: CachedMessage[]) => {
      setMessages((prev) => {
        // Convert cached messages to Message format
        const newMessages = cachedMessages.map((msg) => ({
          id: msg.id,
          userId: msg.userId,
          userName: msg.userName,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp,
          cardConfig: msg.cardConfig,
        }));

        // The cache always provides the full list of messages from the backend
        // So we should replace the state entirely, not merge, to avoid duplicates
        // Deduplicate within the new messages first (in case backend returns duplicates)
        const uniqueMessages = newMessages.reduce(
          (acc, msg) => {
            // Use multiple keys for robust deduplication
            const idKey = msg.id;
            const contentKey = `${msg.userId}:${msg.content.substring(0, 50)}:${
              msg.timestamp
            }`;
            const fullKey = `${idKey}:${contentKey}`;

            // Check if we've already seen this message in the new batch
            if (
              !acc.seenIds.has(idKey) &&
              !acc.seenKeys.has(contentKey) &&
              !acc.seenFull.has(fullKey)
            ) {
              acc.seenIds.add(idKey);
              acc.seenKeys.add(contentKey);
              acc.seenFull.add(fullKey);
              acc.messages.push(msg);
            }
            return acc;
          },
          {
            seenIds: new Set<string>(),
            seenKeys: new Set<string>(),
            seenFull: new Set<string>(),
            messages: [] as Message[],
          }
        ).messages;

        // Sort by timestamp
        const sorted = uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);

        // Update lastMessageId
        if (sorted.length > 0) {
          const lastId = sorted[sorted.length - 1].id;
          lastMessageIdRef.current = lastId;
          setLastMessageId(lastId);
        }

        // Always replace state with the new messages (cache provides full list)
        return sorted;
      });

      // Extract users from messages
      const usersMap = new Map<
        string,
        { id: string; name: string; joinedAt: number }
      >();
      cachedMessages.forEach((msg) => {
        if (msg.userId && msg.userId !== "bot" && msg.userId !== "burpla") {
          // Always prioritize userName over userId for display
          let displayName = msg.userName;
          // If userName is not available or same as userId, format userId nicely
          if (!displayName || displayName === msg.userId) {
            if (msg.userId.startsWith("user_")) {
              const numPart = msg.userId.replace("user_", "");
              // If it's a hex string (like user_49090983), format it nicely
              if (/^[a-f0-9]+$/i.test(numPart) && numPart.length > 6) {
                displayName = `User ${numPart.substring(0, 4)}...`;
              } else {
                displayName = `User ${numPart}`;
              }
            } else {
              displayName = msg.userId;
            }
          }

          if (!usersMap.has(msg.userId)) {
            usersMap.set(msg.userId, {
              id: msg.userId,
              name: displayName,
              joinedAt: msg.timestamp,
            });
          } else {
            const existing = usersMap.get(msg.userId);
            // Always update name if we have a better one (userName is preferred)
            if (existing && msg.userName && msg.userName !== msg.userId) {
              existing.name = msg.userName;
            } else if (
              existing &&
              displayName !== existing.name &&
              displayName !== msg.userId
            ) {
              existing.name = displayName;
            }
          }
        }
      });
      if (usersMap.size > 0) {
        setSessionUsers(Array.from(usersMap.values()));
      }
    };

    // Subscribe to message updates
    const unsubscribe = subscribeToMessages(
      sessionId,
      handleMessagesUpdate,
      userLocation || null
    );

    return () => {
      unsubscribe();
    };
  }, [sessionId, userLocation]);

  // Check if user is at bottom of chat
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 100; // pixels from bottom to consider "at bottom"
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;

    setIsAtBottom(isNearBottom);
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }, [messages.length]);

  // Detect scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check initial position
    checkIfAtBottom();

    // Add scroll listener
    container.addEventListener("scroll", checkIfAtBottom);
    return () => {
      container.removeEventListener("scroll", checkIfAtBottom);
    };
  }, [checkIfAtBottom]);

  // Check if at bottom when messages change
  useEffect(() => {
    // Small delay to allow DOM to update
    setTimeout(() => {
      checkIfAtBottom();
    }, 100);
  }, [checkIfAtBottom]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      checkIfAtBottom();
    }, 300);
  };

  // Refocus input after recommendation cards are rendered
  useEffect(() => {
    // Count recommendation cards in current messages
    const recommendationCardCount = messages.filter(
      (msg) =>
        msg.cardConfig?.type === "restaurant_recommendation" &&
        msg.role === "assistant"
    ).length;

    // Only refocus if a new recommendation card was added
    const newCardAdded =
      recommendationCardCount > previousRecommendationCardCountRef.current;

    if (newCardAdded && inputRef.current && !isLoading && !isSending) {
      // Use a small delay to ensure cards are fully rendered
      const timeoutId = setTimeout(() => {
        if (
          inputRef.current &&
          document.activeElement !== inputRef.current &&
          !inputRef.current.disabled
        ) {
          // Only refocus if input is not disabled and not already focused
          inputRef.current.focus();
        }
      }, 200); // Slightly longer delay to ensure map is rendered

      // Update the ref for next comparison
      previousRecommendationCardCountRef.current = recommendationCardCount;

      return () => clearTimeout(timeoutId);
    } else {
      // Update the ref even if we don't refocus
      previousRecommendationCardCountRef.current = recommendationCardCount;
    }
  }, [messages, isLoading, isSending]);

  // Handle input changes for mention detection and pause polling while typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);

    // Pause polling while user is typing to avoid interrupting input
    if (sessionId) {
      setUserTyping(sessionId, true);

      // Resume polling after user stops typing (debounced)
      if ((handleInputChange as any).typingTimeout) {
        clearTimeout((handleInputChange as any).typingTimeout);
      }
      (handleInputChange as any).typingTimeout = setTimeout(() => {
        setUserTyping(sessionId, false);
      }, 1000); // Resume polling 1 second after user stops typing
    }

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Show mentions if @ is typed and no space after it
      if (!textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt.toLowerCase());
        setShowMentions(true);
        setMentionIndex(-1);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Get mention options (users + bot)
  const getMentionOptions = (): MentionOption[] => {
    const bot: MentionOption = { id: "burpla", name: "burpla", isBot: true };
    const users: MentionOption[] = sessionUsers
      .filter((u) => u.id !== userId) // Exclude current user
      .map((u) => ({ id: u.id, name: u.name, isBot: false }));

    const allOptions = [bot, ...users];

    if (mentionQuery) {
      return allOptions.filter((option) =>
        option.name.toLowerCase().includes(mentionQuery)
      );
    }

    return allOptions;
  };

  // Insert mention into input
  const insertMention = (mention: MentionOption) => {
    const textBeforeCursor = input.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = input.substring(cursorPosition);

    if (lastAtIndex !== -1) {
      const beforeAt = input.substring(0, lastAtIndex);
      const newText = `${beforeAt}@${mention.name} ${textAfterCursor}`;
      setInput(newText);
      setShowMentions(false);
      setMentionQuery("");

      // Focus input and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = lastAtIndex + mention.name.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          setCursorPosition(newCursorPos);
        }
      }, 0);
    }
  };

  // Handle keyboard navigation in mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions) {
      const options = getMentionOptions();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }

      if (e.key === "Enter" && mentionIndex >= 0) {
        e.preventDefault();
        insertMention(options[mentionIndex]);
        return;
      }

      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Check if message mentions burpla
  const mentionsBurpla = (text: string): boolean => {
    const mentionRegex = /@burpla\b/gi;
    return mentionRegex.test(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSending) return;

    // Prevent duplicate sends
    setIsSending(true);

    let messageContent = input.trim();

    // Auto-prepend @burpla if checkbox is checked and not already mentioned
    if (autoMentionBurpla && !mentionsBurpla(messageContent)) {
      messageContent = `@burpla ${messageContent}`;
    }

    const messageMentionsBurpla = mentionsBurpla(messageContent);

    // Auto-check the checkbox if message mentions burpla (so user can continue the conversation)
    if (messageMentionsBurpla) {
      setAutoMentionBurpla(true);
    }

    setInput("");
    setIsLoading(false);
    setShowMentions(false);

    try {
      const messageId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const timestamp = Date.now();

      // Create user message immediately (optimistic update)
      const userMessage: Message = {
        id: messageId,
        userId,
        userName,
        content: messageContent,
        role: "user",
        timestamp,
      };

      // Add message optimistically to cache so it appears immediately
      const cachedMessage: CachedMessage = {
        id: messageId,
        userId,
        userName,
        content: messageContent,
        role: "user",
        timestamp,
      };
      addMessageToCache(sessionId, cachedMessage);

      // The `/chat/sent` endpoint handles saving the message and triggering the AI.
      // The old call to `/api/sessions` with "send" action is now removed.

      // Mark that user stopped typing and resume polling
      if (sessionId) {
        setUserTyping(sessionId, false);
      }

      // Refresh messages after sending to ensure backend has the message
      // The cache already has the optimistic message, so this will just sync with backend
      // setTimeout(() => {
      //   refreshMessages(sessionId, userLocation || null).catch(console.error);
      // }, 500);

      // Only send to AI if @burpla is mentioned
      // Note: The message was already saved to backend via saveMessageToBackend in sessions route
      // So we only need to trigger the AI response here, not save the message again
      if (messageMentionsBurpla) {
        setIsLoading(true);

        // Call backend Python API /chat/sent endpoint
        try {
          // Use the API config helper to get the correct backend URL
          const backendUrl = getApiUrl("/chat/sent");
          console.log("[GroupChat] Calling backend API:", backendUrl);

          // Use the actual user_id from authentication - backend accepts any user_id format
          const sentResponse = await fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId, // Use the actual user_id from authentication
              message: messageContent,
              session_id: sessionId,
              is_to_agent: true,
            }),
          });

          if (sentResponse.ok) {
            // The backend's /chat/sent response now includes the saved messages.
            // We can use this to refresh our local cache directly.
            // No need to optimistically add the bot's message.
            // Let the polling mechanism or a direct refresh handle it.
            refreshMessages(sessionId, userLocation || null).catch(
              console.error
            );
          } else {
            // Backend returned an error
            const errorData = await sentResponse
              .json()
              .catch(() => ({ error: "Unknown error" }));
            throw new Error(
              errorData.detail || errorData.error || "Backend API error"
            );
          }
        } catch (sentError: any) {
          console.error(
            "Failed to call backend /chat/sent endpoint:",
            sentError
          );

          // Display error message
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            userId: "burpla",
            userName: "Burpla",
            content: `Error: ${
              sentError.message ||
              "Failed to get AI response. Please check if the backend is running."
            }`,
            role: "assistant",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If not mentioning burpla, just save the message
        try {
          const backendUrl = getApiUrl("/chat/sent"); // Same endpoint, but is_to_agent is false
          await fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              message: messageContent,
              session_id: sessionId,
              is_to_agent: false, // The only difference
            }),
          });
          // After sending, refresh messages to get the confirmed message from the backend
          refreshMessages(sessionId, userLocation || null).catch(
            console.error
          );
        } catch (error) {
          console.error("Failed to save user message:", error);
        }
      }

      // Reset sending flag
      setIsSending(false);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setIsSending(false); // Reset sending flag on error
      // Display error as chat message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        userId: "burpla",
        userName: "Burpla",
        content: `Error: ${
          error.message ||
          "Failed to send message or get AI response. Please try again."
        }`,
        role: "assistant",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Group messages by user (filter out empty messages)
  const validMessages = messages.filter(
    (msg) => msg.content && msg.content.trim().length > 0
  );
  const groupedMessages: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  validMessages.forEach((message) => {
    const isCurrentUser = message.userId === userId;
    const isBot =
      message.userId === "burpla" ||
      message.userId === "ai" ||
      message.role === "assistant";
    const displayName = isBot
      ? "Burpla"
      : isCurrentUser
      ? userName
      : message.userName;
    const avatar = isBot
      ? "B"
      : displayName.length > 2
      ? displayName.substring(0, 2).toUpperCase()
      : displayName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(displayName);

    if (
      !currentGroup ||
      currentGroup.userId !== message.userId ||
      message.timestamp -
        currentGroup.messages[currentGroup.messages.length - 1].timestamp >
        300000 // 5 minutes
    ) {
      currentGroup = {
        userId: message.userId,
        userName: displayName,
        messages: [],
        avatar,
        avatarColor,
      };
      groupedMessages.push(currentGroup);
    }

    currentGroup.messages.push(message);
  });

  const handleCopySessionLink = async () => {
    try {
      await copySessionLink(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Channel header - sticky at top, always shows full information */}
      <div className="hidden md:flex sticky top-0 z-10 h-12 border-b border-[#333333] items-center justify-between px-4 shadow-sm bg-[#1e1e1e]">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <Hash className="w-5 h-5 text-[#9e9e9e] flex-shrink-0" />
          <span className="text-[#e0e0e0] font-semibold truncate min-w-0">
            {sessionName}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={handleCopySessionLink}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors whitespace-nowrap"
            title="Copy session link"
            aria-label="Copy session link"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Link</span>
              </>
            )}
          </button>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors flex-shrink-0"
              aria-label="Toggle sessions list"
              title="Sessions"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {onToggleUsersPanel && (
            <button
              onClick={onToggleUsersPanel}
              className="p-2 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors flex-shrink-0"
              aria-label="Toggle members list"
              title="Members"
            >
              <Users className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 md:px-4 py-2 md:py-4 bg-[#121212] relative"
      >
        {groupedMessages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[#9e9e9e] text-lg mb-2">Welcome!</div>
              <div className="text-[#9e9e9e] text-sm">
                Start a conversation by typing a message below
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedMessages.map((group, groupIndex) => {
              const isBot =
                group.userId === "burpla" ||
                group.userId === "ai" ||
                group.messages[0]?.role === "assistant";
              return isBot ? (
                <BotMessage
                  key={`${group.userId}-${group.messages[0].timestamp}-${groupIndex}`}
                  group={group}
                  groupIndex={groupIndex}
                  sessionId={sessionId}
                  userId={userId}
                  onVoteUpdate={() =>
                    refreshMessages(sessionId, userLocation || null)
                  }
                />
              ) : (
                <UserMessage
                  key={`${group.userId}-${group.messages[0].timestamp}-${groupIndex}`}
                  group={group}
                  groupIndex={groupIndex}
                />
              );
            })}

            {/* Loading indicator when bot is responding */}
            {isLoading && (
              <div className="group hover:bg-[#1e1e1e] rounded-lg px-4 py-3 mb-3 transition-colors bg-[#2a2a2a]">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/10"
                      style={{
                        backgroundColor: getAvatarColor("Burpla"),
                      }}
                    >
                      <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#e0e0e0]">
                        Burpla
                      </span>
                      <span className="text-xs text-[#9e9e9e]">
                        {format(new Date(), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#9e9e9e] rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-[#9e9e9e] rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-[#9e9e9e] rounded-full animate-bounce delay-150"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 md:bottom-28 right-4 md:right-8 z-30 p-3 bg-[#9c27b0] hover:bg-[#7b1fa2] text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 touch-manipulation"
            aria-label="Scroll to bottom"
            title="Scroll to latest messages"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="px-2 md:px-4 pb-2 md:pb-4 pt-2 bg-[#1e1e1e] border-t border-[#333333]">
        {/* Auto-mention checkbox */}
        <div className="mb-2 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm text-[#9e9e9e] hover:text-[#e0e0e0] transition-colors">
            <input
              type="checkbox"
              checked={autoMentionBurpla}
              onChange={(e) => setAutoMentionBurpla(e.target.checked)}
              className="w-4 h-4 rounded border-[#333333] bg-[#2a2a2a] text-[#9c27b0] focus:ring-2 focus:ring-[#9c27b0] focus:ring-offset-2 focus:ring-offset-[#1e1e1e] cursor-pointer"
            />
            <span>Continue mentioning @burpla</span>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[#2a2a2a] rounded-lg px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3 border border-[#333333]">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message #group-chat`}
                className="w-full bg-transparent text-[#e0e0e0] placeholder-[#9e9e9e] text-sm md:text-base outline-none resize-none"
                disabled={isLoading || isSending}
                tabIndex={0}
                autoFocus={false}
              />

              {/* Mention dropdown */}
              {showMentions && (
                <div
                  ref={mentionsRef}
                  className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-[#2a2a2a] border border-[#333333] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                >
                  <div className="p-2">
                    <div className="text-xs text-[#9e9e9e] px-2 py-1 mb-1">
                      Mention someone
                    </div>
                    {getMentionOptions().map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => insertMention(option)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors ${
                          index === mentionIndex
                            ? "bg-[#9c27b0] text-white"
                            : "text-[#e0e0e0] hover:bg-[#333333]"
                        }`}
                      >
                        {option.isBot ? (
                          <Bot className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <span className="font-medium">{option.name}</span>
                        {option.isBot && (
                          <span className="text-xs text-[#9e9e9e] ml-auto">
                            Bot
                          </span>
                        )}
                      </button>
                    ))}
                    {getMentionOptions().length === 0 && (
                      <div className="px-2 py-2 text-[#9e9e9e] text-sm">
                        No matches found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || isSending || !input.trim()}
              className="p-2 md:p-2 text-[#9e9e9e] hover:text-[#9c27b0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              aria-label="Send message"
            >
              <Send className="w-5 h-5 md:w-5 md:h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

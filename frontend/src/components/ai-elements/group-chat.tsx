"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, Hash, User } from "lucide-react";
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
  type CachedMessage,
} from "@/lib/message-cache";
import { getApiUrl } from "@/lib/api-config";

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
}: GroupChatProps) {
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
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autoMentionBurpla, setAutoMentionBurpla] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

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
          if (!usersMap.has(msg.userId)) {
            usersMap.set(msg.userId, {
              id: msg.userId,
              name: msg.userName || msg.userId,
              joinedAt: msg.timestamp,
            });
          } else {
            const existing = usersMap.get(msg.userId);
            if (existing && msg.userName && msg.userName !== msg.userId) {
              existing.name = msg.userName;
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle input changes for mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);

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
    if (!input.trim() || isLoading) return;

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

      // Add user message to local state immediately, with enhanced deduplication
      setMessages((prev) => {
        // Enhanced deduplication: check by ID, userId+content+timestamp, and content+timestamp
        const existingIds = new Set(prev.map((m) => m.id));
        const existingMessageKeys = new Set(
          prev.map(
            (m) => `${m.userId}:${m.content.substring(0, 50)}:${m.timestamp}`
          )
        );
        const existingContentKeys = new Set(
          prev.map((m) => `${m.content.substring(0, 100)}:${m.timestamp}`)
        );

        const messageKey = `${
          userMessage.userId
        }:${userMessage.content.substring(0, 50)}:${userMessage.timestamp}`;
        const contentKey = `${userMessage.content.substring(0, 100)}:${
          userMessage.timestamp
        }`;

        // Skip if already exists (by ID, userId+content+timestamp, or content+timestamp)
        if (
          existingIds.has(userMessage.id) ||
          existingMessageKeys.has(messageKey) ||
          existingContentKeys.has(contentKey)
        ) {
          return prev;
        }

        const combined = [...prev, userMessage];
        // Remove duplicates after combining
        const uniqueMessages = combined.reduce(
          (acc, msg) => {
            const key = `${msg.id}:${msg.userId}:${msg.content.substring(
              0,
              50
            )}:${msg.timestamp}`;
            if (!acc.seen.has(key)) {
              acc.seen.add(key);
              acc.messages.push(msg);
            }
            return acc;
          },
          { seen: new Set<string>(), messages: [] as Message[] }
        ).messages;

        return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
      });

      // Send message to session
      const sendResponse = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          sessionId,
          userId,
          message: messageContent,
          messageId,
        }),
      });

      // Don't refresh immediately - the optimistic update is already shown
      // The cache will pick it up on the next poll cycle
      // This prevents the message from appearing twice (once from optimistic update, once from refresh)

      // Only send to AI if @burpla is mentioned
      if (sendResponse.ok && messageMentionsBurpla) {
        setIsLoading(true);

        // Call backend Python API /sent endpoint
        try {
          // Use the API config helper to get the correct backend URL
          const backendUrl = getApiUrl("/sent");
          console.log("[GroupChat] Calling backend API:", backendUrl);

          const sentResponse = await fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // user_id: parseInt(userId) || 1,
              user_id: "user_001",
              name: userName,
              message: messageContent,
              id: messageId,
              is_to_agent: true,
              session_id: sessionId,
              // Backend doesn't support location/sessionId yet, but we'll include them for future compatibility
              // location: userLocation
              //   ? { lat: userLocation.lat, lng: userLocation.lng }
              //   : undefined,
            }),
          });

          if (sentResponse.ok) {
            const sentData = await sentResponse.json();

            // Parse the message to check if it contains a card (recommendation or voting)
            const { content: messageContent, cardConfig } = parseMessageForCard(
              sentData.message || "",
              userLocation || null
            );

            // Create message with cardConfig if available
            // Backend returns: { user_id, name, message, id }
            const aiMessage: Message = {
              id: sentData.id || messageId,
              userId: "burpla",
              userName: sentData.name || "Burpla",
              content: messageContent,
              role: "assistant",
              timestamp: Date.now(),
              cardConfig: cardConfig,
            };

            setMessages((prev) => {
              // Check if message already exists (by ID or by content + userId + timestamp)
              const existingIds = new Set(prev.map((m) => m.id));
              const existingMessageKeys = new Set(
                prev.map(
                  (m) =>
                    `${m.userId}:${m.content.substring(0, 50)}:${m.timestamp}`
                )
              );

              const messageKey = `${
                aiMessage.userId
              }:${aiMessage.content.substring(0, 50)}:${aiMessage.timestamp}`;

              // Skip if already exists
              if (
                existingIds.has(aiMessage.id) ||
                existingMessageKeys.has(messageKey)
              ) {
                return prev;
              }

              const combined = [...prev, aiMessage];
              // Remove duplicates after combining
              const uniqueMessages = combined.reduce(
                (acc, msg) => {
                  const key = `${msg.id}:${msg.userId}:${msg.content.substring(
                    0,
                    50
                  )}:${msg.timestamp}`;
                  if (!acc.seen.has(key)) {
                    acc.seen.add(key);
                    acc.messages.push(msg);
                  }
                  return acc;
                },
                { seen: new Set<string>(), messages: [] as Message[] }
              ).messages;

              return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
            });

            // Save to session (still using Next.js API for session management)
            try {
              await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "send",
                  sessionId,
                  userId: "burpla",
                  message: messageContent, // Use processed messageContent instead of raw sentData.message
                  messageId: sentData.id || messageId,
                  cardConfig: cardConfig, // Include cardConfig if available
                }),
              });
            } catch (sessionError) {
              console.error("Failed to save to session:", sessionError);
            }

            // Don't refresh immediately - the AI message is already added optimistically
            // The cache will pick it up on the next poll cycle

            setIsLoading(false);
            return; // Exit early since we got response from backend
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
          console.error("Failed to call backend /sent endpoint:", sentError);

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
          setMessages((prev) => {
            // Check if message already exists
            const existingIds = new Set(prev.map((m) => m.id));
            if (existingIds.has(errorMessage.id)) {
              return prev;
            }
            const combined = [...prev, errorMessage];
            // Remove duplicates after combining
            const uniqueMessages = combined.reduce(
              (acc, msg) => {
                const key = `${msg.id}:${msg.userId}:${msg.content.substring(
                  0,
                  50
                )}:${msg.timestamp}`;
                if (!acc.seen.has(key)) {
                  acc.seen.add(key);
                  acc.messages.push(msg);
                }
                return acc;
              },
              { seen: new Set<string>(), messages: [] as Message[] }
            ).messages;
            return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
          });
          setIsLoading(false);
          return;
        }

        // Note: Backend doesn't support streaming, all responses come from /sent endpoint
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
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
      setMessages((prev) => {
        // Check if message already exists
        const existingIds = new Set(prev.map((m) => m.id));
        if (existingIds.has(errorMessage.id)) {
          return prev;
        }
        const combined = [...prev, errorMessage];
        // Remove duplicates after combining
        const uniqueMessages = combined.reduce(
          (acc, msg) => {
            const key = `${msg.id}:${msg.userId}:${msg.content.substring(
              0,
              50
            )}:${msg.timestamp}`;
            if (!acc.seen.has(key)) {
              acc.seen.add(key);
              acc.messages.push(msg);
            }
            return acc;
          },
          { seen: new Set<string>(), messages: [] as Message[] }
        ).messages;
        return uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
      });
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

  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      {/* Channel header */}
      <div className="h-12 border-b border-[#333333] flex items-center px-4 shadow-sm bg-[#1e1e1e]">
        <Hash className="w-5 h-5 text-[#9e9e9e] mr-2" />
        <span className="text-[#e0e0e0] font-semibold">group-chat</span>
        <span className="ml-2 text-xs text-[#9e9e9e]">
          Session: {sessionId.substring(0, 8)}...
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#121212]">
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
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 bg-[#1e1e1e] border-t border-[#333333]">
        {/* Auto-mention checkbox */}
        <div className="mb-2 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#9e9e9e] hover:text-[#e0e0e0] transition-colors">
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
          <div className="bg-[#2a2a2a] rounded-lg px-4 py-3 flex items-center gap-3 border border-[#333333]">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message #group-chat`}
                className="w-full bg-transparent text-[#e0e0e0] placeholder-[#9e9e9e] text-base outline-none resize-none"
                disabled={isLoading}
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
              disabled={isLoading || !input.trim()}
              className="p-2 text-[#9e9e9e] hover:text-[#9c27b0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

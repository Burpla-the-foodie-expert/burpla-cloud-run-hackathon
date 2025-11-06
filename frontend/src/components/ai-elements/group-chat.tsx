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
  type ConvoMessage,
} from "@/lib/conversation-utils";
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

  // Fetch session users
  useEffect(() => {
    if (!sessionId) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/sessions?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.users) {
            setSessionUsers(data.users);
          }
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();
  }, [sessionId]);

  // Poll for new messages and users
  useEffect(() => {
    if (!sessionId) return;

    // Sync ref with state
    lastMessageIdRef.current = lastMessageId;

    const pollMessages = async () => {
      try {
        const currentLastId = lastMessageIdRef.current;
        const response = await fetch(
          `/api/sessions?sessionId=${sessionId}&lastMessageId=${
            currentLastId || ""
          }`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const newMessages = data.messages.filter(
                (msg: Message) =>
                  !prev.some((m) => m.id === msg.id) && msg.id !== currentLastId
              );
              if (newMessages.length > 0) {
                const combined = [...prev, ...newMessages];
                // Sort by timestamp
                const sorted = combined.sort(
                  (a, b) => a.timestamp - b.timestamp
                );
                // Update lastMessageId
                const lastId = sorted[sorted.length - 1].id;
                lastMessageIdRef.current = lastId;
                setLastMessageId(lastId);
                return sorted;
              }
              return prev;
            });
          }
          // Update users list
          if (data.users) {
            setSessionUsers(data.users);
          }
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollMessages, 2000);

    // Also poll immediately
    pollMessages();

    return () => clearInterval(interval);
  }, [sessionId, lastMessageId]);

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

  // Parse Python dict string to JavaScript object
  // Handles strings like: "{'type': 'recommendation_card', 'options': [...], 'error': None}"
  const parsePythonDict = (str: string): any => {
    try {
      // Replace Python None with null (before quote replacement)
      let jsonStr = str.replace(/None/g, "null");

      // Handle escaped double quotes in strings (like \"Pho X Trang's\")
      // First, replace escaped double quotes with a temporary placeholder
      jsonStr = jsonStr.replace(/\\"/g, "___ESCAPED_QUOTE___");

      // Replace single quotes with double quotes
      jsonStr = jsonStr.replace(/'/g, '"');

      // Restore the escaped double quotes (now they're regular escaped quotes)
      jsonStr = jsonStr.replace(/___ESCAPED_QUOTE___/g, '\\"');

      // Try to parse
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (error) {
      console.error("Failed to parse Python dict:", error, str);
      // If parsing fails, try a more permissive approach using Function constructor
      // This handles Python dict syntax more accurately (note: input is from our own backend, so safe)
      try {
        let pythonStr = str
          .replace(/None/g, "null")
          .replace(/True/g, "true")
          .replace(/False/g, "false");
        const func = new Function("return " + pythonStr);
        return func();
      } catch (fallbackError) {
        console.error("Fallback parsing also failed:", fallbackError);
        return null;
      }
    }
  };

  // Convert backend recommendation card format to InteractiveCardConfig
  const convertRecommendationCard = (
    data: any
  ): InteractiveCardConfig | undefined => {
    if (!data || data.type !== "recommendation_card" || !data.options) {
      return undefined;
    }

    // If there's an error, don't show the card
    if (data.error) {
      console.warn("Recommendation card has error:", data.error);
      return undefined;
    }

    const restaurants = data.options.map((opt: any) => {
      // Convert price level string to number if possible
      let priceLevel: number | undefined;
      if (opt.priceLevel && opt.priceLevel !== "N/A") {
        // Map price level strings to numbers
        const priceLevelMap: Record<string, number> = {
          PRICE_LEVEL_FREE: 0,
          PRICE_LEVEL_INEXPENSIVE: 1,
          PRICE_LEVEL_MODERATE: 2,
          PRICE_LEVEL_EXPENSIVE: 3,
          PRICE_LEVEL_VERY_EXPENSIVE: 4,
        };
        priceLevel = priceLevelMap[opt.priceLevel] ?? undefined;
      }

      // Convert rating string to number
      const rating = opt.rating ? parseFloat(opt.rating) : undefined;

      return {
        id: opt.restaurant_id || undefined,
        name: opt.restaurant_name,
        address: opt.formattedAddress || opt.description,
        formattedAddress: opt.formattedAddress || opt.description,
        rating: rating,
        userRatingCount: opt.userRatingCount,
        priceLevel: priceLevel,
        photoUri: opt.image || undefined,
        googleMapsUri: opt.map,
        hyperlink: opt.map,
      };
    });

    return {
      type: "restaurant_recommendation",
      config: {
        restaurants,
        userLocation: userLocation
          ? { lat: userLocation.lat, lng: userLocation.lng }
          : undefined,
        title: "Restaurant Recommendations",
      },
    };
  };

  // Convert backend voting card format to InteractiveCardConfig
  const convertVotingCard = (data: any): InteractiveCardConfig | undefined => {
    if (!data || data.type !== "vote_card" || !data.vote_options) {
      return undefined;
    }

    // Convert vote options to the format expected by VotingCardConfig
    const options = data.vote_options.map((opt: any) => {
      // Convert rating string to number
      const rating = opt.rating ? parseFloat(opt.rating) : undefined;

      return {
        id: opt.restaurant_id || undefined,
        restaurant_id: opt.restaurant_id || undefined,
        name: opt.restaurant_name,
        restaurant_name: opt.restaurant_name,
        description: opt.description,
        image: opt.image || undefined,
        photoUri: opt.image || undefined,
        votes: opt.number_of_vote || 0,
        number_of_vote: opt.number_of_vote || 0,
        map: opt.map,
        googleMapsUri: opt.map,
        hyperlink: opt.map,
        rating: rating,
        userRatingCount: opt.userRatingCount,
      };
    });

    // Calculate total votes
    const totalVotes = options.reduce((sum: number, opt: any) => {
      return sum + (opt.votes || opt.number_of_vote || 0);
    }, 0);

    return {
      type: "voting",
      config: {
        question: "Vote for your favorite restaurant:",
        options,
        totalVotes,
        allowVoting: false, // Set to true if you want to enable voting functionality
      },
    };
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

      // Add user message to local state immediately
      setMessages((prev) =>
        [...prev, userMessage].sort((a, b) => a.timestamp - b.timestamp)
      );

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
            let cardConfig: InteractiveCardConfig | undefined = undefined;
            let messageContent = sentData.message || "";

            // Try to parse the message as a Python dict string
            // Check if message looks like a Python dict (starts with { and contains 'type')
            if (
              messageContent.trim().startsWith("{") &&
              messageContent.includes("'type'")
            ) {
              const parsedData = parsePythonDict(messageContent);
              if (parsedData) {
                // Check for recommendation card
                if (parsedData.type === "recommendation_card") {
                  cardConfig = convertRecommendationCard(parsedData);
                  if (cardConfig) {
                    // Set a user-friendly message content when we have a card
                    messageContent = `Here are some restaurant recommendations:`;
                  }
                }
                // Check for voting card
                else if (parsedData.type === "vote_card") {
                  cardConfig = convertVotingCard(parsedData);
                  if (cardConfig) {
                    // Set a user-friendly message content when we have a voting card
                    messageContent = `Vote for your favorite restaurant:`;
                  }
                }
              }
            }

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

            setMessages((prev) =>
              [...prev, aiMessage].sort((a, b) => a.timestamp - b.timestamp)
            );

            // Save to session (still using Next.js API for session management)
            try {
              await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "send",
                  sessionId,
                  userId: "burpla",
                  message: sentData.message,
                  messageId: sentData.id || messageId,
                }),
              });
            } catch (sessionError) {
              console.error("Failed to save to session:", sessionError);
            }

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
          setMessages((prev) =>
            [...prev, errorMessage].sort((a, b) => a.timestamp - b.timestamp)
          );
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
      setMessages((prev) =>
        [...prev, errorMessage].sort((a, b) => a.timestamp - b.timestamp)
      );
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
    <div className="flex flex-col h-screen bg-[#36393f]">
      {/* Channel header */}
      <div className="h-12 border-b border-[#2f3136] flex items-center px-4 shadow-sm">
        <Hash className="w-5 h-5 text-[#72767d] mr-2" />
        <span className="text-white font-semibold">group-chat</span>
        <span className="ml-2 text-xs text-[#72767d]">
          Session: {sessionId.substring(0, 8)}...
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {groupedMessages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[#72767d] text-lg mb-2">Welcome!</div>
              <div className="text-[#72767d] text-sm">
                Start a conversation by typing a message below
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
              <div className="group hover:bg-[#32353b] rounded px-4 py-1 -mx-4 transition-colors">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{
                        backgroundColor: getAvatarColor("Burpla"),
                      }}
                    >
                      <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-white">
                        Burpla
                      </span>
                      <span className="text-xs text-[#72767d]">
                        {format(new Date(), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#72767d] rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-[#72767d] rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-[#72767d] rounded-full animate-bounce delay-150"></span>
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
      <div className="px-4 pb-4">
        {/* Auto-mention checkbox */}
        <div className="mb-2 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#b9bbbe] hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={autoMentionBurpla}
              onChange={(e) => setAutoMentionBurpla(e.target.checked)}
              className="w-4 h-4 rounded border-[#40444b] bg-[#40444b] text-[#5865f2] focus:ring-2 focus:ring-[#5865f2] focus:ring-offset-2 focus:ring-offset-[#36393f] cursor-pointer"
            />
            <span>Continue mentioning @burpla</span>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[#40444b] rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message #group-chat`}
                className="w-full bg-transparent text-[#dcddde] placeholder-[#72767d] text-base outline-none resize-none"
                disabled={isLoading}
              />

              {/* Mention dropdown */}
              {showMentions && (
                <div
                  ref={mentionsRef}
                  className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-[#2f3136] border border-[#40444b] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                >
                  <div className="p-2">
                    <div className="text-xs text-[#72767d] px-2 py-1 mb-1">
                      Mention someone
                    </div>
                    {getMentionOptions().map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => insertMention(option)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors ${
                          index === mentionIndex
                            ? "bg-[#5865f2] text-white"
                            : "text-[#dcddde] hover:bg-[#40444b]"
                        }`}
                      >
                        {option.isBot ? (
                          <Bot className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <span className="font-medium">{option.name}</span>
                        {option.isBot && (
                          <span className="text-xs text-[#72767d] ml-auto">
                            Bot
                          </span>
                        )}
                      </button>
                    ))}
                    {getMentionOptions().length === 0 && (
                      <div className="px-2 py-2 text-[#72767d] text-sm">
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
              className="p-2 text-[#b9bbbe] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

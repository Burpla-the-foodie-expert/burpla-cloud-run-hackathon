"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, Hash, User } from "lucide-react";
import { format } from "date-fns";
import { UserMessage } from "./user-message";
import { BotMessage } from "./bot-message";
import { InteractiveCard } from "./interactive-card";
import type { InteractiveCardConfig } from "./interactive-card";

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
}

export function GroupChat({
  sessionId,
  userLocation,
  userName,
  userId,
  initialMessages,
  initialUsers,
}: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [sessionUsers, setSessionUsers] = useState<SessionUser[]>(
    initialUsers || []
  );
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    const messageMentionsBurpla = mentionsBurpla(messageContent);
    setInput("");
    setIsLoading(false);
    setShowMentions(false);

    try {
      const messageId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

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

        // Get recent messages for context
        const recentMessages = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Send to AI endpoint
        const aiResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...recentMessages,
              {
                role: "user",
                content: messageContent,
              },
            ],
            ...(userLocation && {
              location: {
                latitude: userLocation.lat,
                longitude: userLocation.lng,
              },
            }),
            userName,
          }),
        });

        if (aiResponse.ok) {
          // Handle AI streaming response
          const reader = aiResponse.body?.getReader();
          const decoder = new TextDecoder();
          let aiMessageContent = "";
          let buffer = "";
          const aiMessageId = `ai-${Date.now()}`;

          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                  if (!line.trim()) continue;

                  try {
                    // AI SDK format: "0:{"type":"text-delta","textDelta":"..."}"
                    // or "0:{"type":"text","text":"..."}"
                    if (line.startsWith("0:")) {
                      const jsonStr = line.substring(2).trim();
                      if (jsonStr) {
                        const data = JSON.parse(jsonStr);
                        if (data.type === "text-delta" && data.textDelta) {
                          aiMessageContent += data.textDelta;
                        } else if (data.type === "text" && data.text) {
                          aiMessageContent = data.text; // Full text replaces content
                        } else if (data.delta) {
                          // Some formats use delta directly
                          aiMessageContent += data.delta;
                        }
                      }
                    }
                    // Direct JSON format
                    else if (line.startsWith("{") && line.endsWith("}")) {
                      const data = JSON.parse(line);
                      if (data.type === "text-delta" && data.textDelta) {
                        aiMessageContent += data.textDelta;
                      } else if (data.type === "text" && data.text) {
                        aiMessageContent = data.text;
                      } else if (data.delta) {
                        aiMessageContent += data.delta;
                      } else if (data.content) {
                        aiMessageContent += data.content;
                      }
                    }
                  } catch (e) {
                    // Skip invalid JSON - might be partial chunk or other format
                    console.debug(
                      "Failed to parse line:",
                      line.substring(0, 50),
                      e
                    );
                  }
                }

                // Update AI message in real-time whenever content changes
                if (aiMessageContent) {
                  const aiMessage: Message = {
                    id: aiMessageId,
                    userId: "burpla",
                    userName: "Burpla",
                    content: aiMessageContent,
                    role: "assistant",
                    timestamp: Date.now(),
                  };

                  setMessages((prev) => {
                    const filtered = prev.filter((m) => m.id !== aiMessageId);
                    return [...filtered, aiMessage].sort(
                      (a, b) => a.timestamp - b.timestamp
                    );
                  });
                }
              }

              // Process any remaining buffer
              if (buffer.trim()) {
                try {
                  if (buffer.startsWith("0:")) {
                    const jsonStr = buffer.substring(2).trim();
                    if (jsonStr) {
                      const data = JSON.parse(jsonStr);
                      if (data.type === "text-delta" && data.textDelta) {
                        aiMessageContent += data.textDelta;
                      } else if (data.type === "text" && data.text) {
                        aiMessageContent = data.text;
                      }
                    }
                  }
                } catch (e) {
                  console.debug("Failed to parse final buffer:", e);
                }
              }
            } catch (streamError: any) {
              console.error("Streaming error:", streamError);
              // Display error as chat message
              const errorMessage: Message = {
                id: `error-${Date.now()}`,
                userId: "burpla",
                userName: "Burpla",
                content: `Error: ${
                  streamError.message ||
                  "Failed to get AI response. Please try again."
                }`,
                role: "assistant",
                timestamp: Date.now(),
              };
              setMessages((prev) =>
                [...prev, errorMessage].sort(
                  (a, b) => a.timestamp - b.timestamp
                )
              );
            }
          }

          // Save final AI message to session after streaming completes
          if (aiMessageContent.trim()) {
            // Final update with complete message
            const finalMessage: Message = {
              id: aiMessageId,
              userId: "burpla",
              userName: "Burpla",
              content: aiMessageContent,
              role: "assistant",
              timestamp: Date.now(),
            };

            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== aiMessageId);
              return [...filtered, finalMessage].sort(
                (a, b) => a.timestamp - b.timestamp
              );
            });

            // Save to session
            await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "send",
                sessionId,
                userId: "burpla",
                message: aiMessageContent,
                messageId: aiMessageId,
              }),
            });
          } else {
            // Remove empty loading message if no content was received
            setMessages((prev) => prev.filter((m) => m.id !== aiMessageId));
          }
        } else {
          // Handle non-OK response (error from API)
          const errorData = await aiResponse
            .json()
            .catch(() => ({ error: "Unknown error" }));
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            userId: "burpla",
            userName: "Burpla",
            content: `Error: ${
              errorData.error || "Failed to get AI response. Please try again."
            }`,
            role: "assistant",
            timestamp: Date.now(),
          };
          setMessages((prev) =>
            [...prev, errorMessage].sort((a, b) => a.timestamp - b.timestamp)
          );
        }
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

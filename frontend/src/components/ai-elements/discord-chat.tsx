"use client";

import { useChat } from "ai/react";
import { Bot, Send, Hash } from "lucide-react";
import { format } from "date-fns";

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

interface MessageGroup {
  role: "user" | "assistant";
  messages: Array<{ id: string; content: string; createdAt?: Date }>;
  author: string;
  avatar: string;
  avatarColor: string;
}

interface DiscordChatProps {
  userLocation?: { lat: number; lng: number } | null;
  userName?: string;
}

export function DiscordChat({
  userLocation,
  userName = "User",
}: DiscordChatProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: {
        ...(userLocation && {
          location: {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
          },
        }),
        ...(userName && { userName }),
      },
    });

  // Group consecutive messages from the same author
  const groupedMessages: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .forEach((message, index, filteredMessages) => {
      const isUser = message.role === "user";
      const author = isUser ? userName : "AI Assistant";
      const avatar = isUser ? userName.charAt(0).toUpperCase() : "AI";
      const avatarColor = getAvatarColor(author);

      // Check if we should start a new group
      if (
        !currentGroup ||
        currentGroup.role !== message.role ||
        (index > 0 && filteredMessages[index - 1].role !== message.role)
      ) {
        currentGroup = {
          role: message.role as "user" | "assistant",
          messages: [],
          author,
          avatar,
          avatarColor,
        };
        groupedMessages.push(currentGroup);
      }

      if (currentGroup) {
        currentGroup.messages.push({
          id: message.id,
          content: message.content,
          createdAt: new Date(),
        });
      }
    });

  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      {/* Channel header */}
      <div className="h-12 border-b border-[#333333] flex items-center px-4 shadow-sm bg-[#1e1e1e]">
        <Hash className="w-5 h-5 text-[#9e9e9e] mr-2" />
        <span className="text-[#e0e0e0] font-semibold">ai-chat</span>
        <span className="ml-2 text-xs text-[#9e9e9e]">
          AI-powered conversations
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#121212]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[#9e9e9e] text-lg mb-2">
                Welcome to #ai-chat
              </div>
              <div className="text-[#9e9e9e] text-sm">
                Start a conversation by typing a message below
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedMessages.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="group hover:bg-[#1e1e1e] rounded-lg px-4 py-3 mb-3 transition-colors bg-[#2a2a2a]"
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {group.role === "user" ? (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium border border-white/10"
                        style={{ backgroundColor: group.avatarColor }}
                      >
                        {group.avatar.length > 2
                          ? group.avatar.substring(0, 2).toUpperCase()
                          : group.avatar}
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/10"
                        style={{ backgroundColor: group.avatarColor }}
                      >
                        <Bot className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    {/* Author and timestamp */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#e0e0e0]">
                        {group.author}
                      </span>
                      <span className="text-xs text-[#9e9e9e]">
                        {format(new Date(), "h:mm a")}
                      </span>
                    </div>

                    {/* Messages in group */}
                    {group.messages.map((message) => (
                      <div key={message.id} className="mb-2 last:mb-0">
                        <div className="text-[#e0e0e0] text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="group hover:bg-[#1e1e1e] rounded-lg px-4 py-3 mb-3 transition-colors bg-[#2a2a2a]">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/10"
                      style={{
                        backgroundColor: getAvatarColor("AI Assistant"),
                      }}
                    >
                      <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-[#e0e0e0]">
                        AI Assistant
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
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 bg-[#1e1e1e] border-t border-[#333333]">
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[#2a2a2a] rounded-lg px-4 py-3 flex items-center gap-3 border border-[#333333]">
            <div className="flex-1">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={`Message #ai-chat`}
                className="w-full bg-transparent text-[#e0e0e0] placeholder-[#9e9e9e] text-base outline-none resize-none"
                disabled={isLoading}
              />
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

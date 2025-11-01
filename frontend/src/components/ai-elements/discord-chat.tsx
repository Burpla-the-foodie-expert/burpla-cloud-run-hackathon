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
    <div className="flex flex-col h-screen bg-[#36393f]">
      {/* Channel header */}
      <div className="h-12 border-b border-[#2f3136] flex items-center px-4 shadow-sm">
        <Hash className="w-5 h-5 text-[#72767d] mr-2" />
        <span className="text-white font-semibold">ai-chat</span>
        <span className="ml-2 text-xs text-[#72767d]">
          AI-powered conversations
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[#72767d] text-lg mb-2">
                Welcome to #ai-chat
              </div>
              <div className="text-[#72767d] text-sm">
                Start a conversation by typing a message below
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="group hover:bg-[#32353b] rounded px-4 py-1 -mx-4 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {group.role === "user" ? (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: group.avatarColor }}
                      >
                        {group.avatar.length > 2
                          ? group.avatar.substring(0, 2).toUpperCase()
                          : group.avatar}
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: group.avatarColor }}
                      >
                        <Bot className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    {/* Author and timestamp */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-white">
                        {group.author}
                      </span>
                      <span className="text-xs text-[#72767d]">
                        {format(new Date(), "h:mm a")}
                      </span>
                    </div>

                    {/* Messages in group */}
                    {group.messages.map((message) => (
                      <div key={message.id} className="mb-1 last:mb-0">
                        <div className="text-[#dcddde] text-base whitespace-pre-wrap break-words">
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
              <div className="group hover:bg-[#32353b] rounded px-4 py-1 -mx-4 transition-colors">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{
                        backgroundColor: getAvatarColor("AI Assistant"),
                      }}
                    >
                      <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-white">
                        AI Assistant
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
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[#40444b] rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={`Message #ai-chat`}
                className="w-full bg-transparent text-[#dcddde] placeholder-[#72767d] text-base outline-none resize-none"
                disabled={isLoading}
              />
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

import { Bot } from "lucide-react";
import { format } from "date-fns";
import { InteractiveCard } from "./interactive-card";
import type { InteractiveCardConfig } from "./interactive-card";

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: InteractiveCardConfig;
}

interface MessageGroup {
  userId: string;
  userName: string;
  messages: Array<Message>;
  avatar: string;
  avatarColor: string;
}

interface BotMessageProps {
  group: MessageGroup;
  groupIndex: number;
}

export function BotMessage({ group, groupIndex }: BotMessageProps) {
  return (
    <div
      key={`${group.userId}-${group.messages[0].timestamp}-${groupIndex}`}
      className="group hover:bg-[#1e1e1e] rounded-lg px-4 py-3 mb-3 transition-colors bg-[#2a2a2a]"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/10"
            style={{ backgroundColor: group.avatarColor }}
          >
            <Bot className="w-6 h-6" />
          </div>
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Author and timestamp */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[#e0e0e0]">
              {group.userName}
            </span>
            <span className="text-xs text-[#9e9e9e]">
              {format(new Date(group.messages[0].timestamp), "h:mm a")}
            </span>
          </div>

          {/* Messages in group */}
          {group.messages.map((message) => {
            const isError = message.content.startsWith("Error:");
            return (
              <div key={message.id} className="mb-3 last:mb-0">
                {message.content && (
                  <div
                    className={`text-sm whitespace-pre-wrap break-words mb-2 ${
                      isError
                        ? "text-red-400 bg-red-900/20 border border-red-800/30 px-3 py-2 rounded"
                        : "text-[#e0e0e0]"
                    }`}
                  >
                    {message.content}
                  </div>
                )}
                {message.cardConfig && (
                  <InteractiveCard cardConfig={message.cardConfig} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


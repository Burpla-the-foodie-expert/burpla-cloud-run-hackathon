import { User } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
}

interface MessageGroup {
  userId: string;
  userName: string;
  messages: Array<Message>;
  avatar: string;
  avatarColor: string;
}

interface UserMessageProps {
  group: MessageGroup;
  groupIndex: number;
}

export function UserMessage({ group, groupIndex }: UserMessageProps) {
  return (
    <div
      key={`${group.userId}-${group.messages[0].timestamp}-${groupIndex}`}
      className="group hover:bg-[#32353b] rounded px-4 py-1 -mx-4 transition-colors"
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: group.avatarColor }}
          >
            {group.avatar}
          </div>
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Author and timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-medium text-white">
              {group.userName}
            </span>
            <span className="text-xs text-[#72767d]">
              {format(new Date(group.messages[0].timestamp), "h:mm a")}
            </span>
          </div>

          {/* Messages in group */}
          {group.messages.map((message) => {
            const isError = message.content.startsWith("Error:");
            return (
              <div key={message.id} className="mb-1 last:mb-0">
                <div
                  className={`text-base whitespace-pre-wrap break-words ${
                    isError
                      ? "text-[#ed4245] bg-[#ed4245]/10 border border-[#ed4245]/30 px-3 py-2 rounded"
                      : "text-[#dcddde]"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


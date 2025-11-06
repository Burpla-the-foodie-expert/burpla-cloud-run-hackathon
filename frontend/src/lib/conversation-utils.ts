import type { InteractiveCardConfig } from "@/components/ai-elements/interactive-card";

// Types for convo_sample.json format
export interface ConvoMessage {
  message_id: string;
  sender_id: number;
  sender_name: string;
  type: "text" | "vote_card" | "reminder_card" | "end_card";
  content: {
    text?: string;
    title?: string;
    vote_options?: Array<{
      restaurant_id?: string;
      restaurant_name?: string;
      description?: string;
      image?: string;
      review?: string;
      number_of_vote?: number;
      map?: string;
    }>;
    selected_restaurant_name?: string;
    time_selection?: string;
    date_selection?: string;
    list_of_people?: string[];
    additional_notes?: string;
    message?: string;
    see_you_at?: {
      restaurant_name?: string;
      direction?: {
        address_text?: string;
        google_map_hyperlink?: string;
      };
      datetime?: string;
    };
  };
}

// Types for group-chat format
export interface GroupChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: InteractiveCardConfig;
}

/**
 * Converts a conversation message from the convo_sample.json format
 * to the format expected by the group-chat component
 */
export function convertConvoMessageToGroupChatMessage(
  convoMsg: ConvoMessage,
  baseTimestamp: number = Date.now(),
  index: number = 0
): GroupChatMessage {
  const isBot = convoMsg.sender_id === 0;
  const userId = isBot ? "burpla" : `user-${convoMsg.sender_id}`;

  // Calculate timestamp (spread messages over time)
  const timestamp = baseTimestamp + index * 60000; // 1 minute apart

  let content = "";
  let cardConfig: InteractiveCardConfig | undefined;

  // Handle different message types
  switch (convoMsg.type) {
    case "text": {
      content = convoMsg.content.text || "";
      break;
    }

    case "vote_card": {
      content = convoMsg.content.text || convoMsg.content.title || "Vote for your favorite option:";

      const voteOptions = (convoMsg.content.vote_options || []).map((opt, idx) => ({
        id: opt.restaurant_id || `option-${idx}`,
        restaurant_name: opt.restaurant_name || `Option ${idx + 1}`,
        name: opt.restaurant_name || `Option ${idx + 1}`,
        description: opt.description || "",
        image: opt.image || "",
        photoUri: opt.image || "",
        review: opt.review || "",
        number_of_vote: opt.number_of_vote || 0,
        votes: opt.number_of_vote || 0,
        map: opt.map || "",
        hyperlink: opt.map || "",
        googleMapsUri: opt.map || "",
      }));

      const totalVotes = voteOptions.reduce((sum, opt) => sum + (opt.number_of_vote || 0), 0);

      cardConfig = {
        type: "voting",
        config: {
          question: convoMsg.content.title || "Vote for your favorite option:",
          options: voteOptions,
          totalVotes,
          allowVoting: false, // Set to true if you want to enable voting
        },
      };
      break;
    }

    case "reminder_card": {
      content = convoMsg.content.title || "Reminder";

      // Parse datetime from date_selection and time_selection
      let reminderTime: Date | string = new Date();
      if (convoMsg.content.date_selection && convoMsg.content.time_selection) {
        // Try to parse the datetime string if available
        // Format: "Friday, November 7th, 2025" + "7:00 PM CST"
        try {
          // This is a simplified parser - you might need to enhance it
          reminderTime = new Date(); // For now, use current time
        } catch {
          reminderTime = new Date();
        }
      }

      const description = [
        convoMsg.content.selected_restaurant_name && `Restaurant: ${convoMsg.content.selected_restaurant_name}`,
        convoMsg.content.time_selection && `Time: ${convoMsg.content.time_selection}`,
        convoMsg.content.date_selection && `Date: ${convoMsg.content.date_selection}`,
        convoMsg.content.list_of_people && `Attendees: ${convoMsg.content.list_of_people.join(", ")}`,
        convoMsg.content.additional_notes,
      ]
        .filter(Boolean)
        .join("\n");

      cardConfig = {
        type: "reminder",
        config: {
          title: convoMsg.content.title || "Reminder",
          description: description || "",
          location: convoMsg.content.selected_restaurant_name
            ? {
                name: convoMsg.content.selected_restaurant_name,
                address: "",
              }
            : undefined,
          time: reminderTime,
          priority: "medium" as const,
        },
      };
      break;
    }

    case "end_card": {
      content = convoMsg.content.title || convoMsg.content.message || "Reminder confirmed!";

      // Parse see_you_at if available
      if (convoMsg.content.see_you_at) {
        const seeYouAt = convoMsg.content.see_you_at;
        let reminderTime: Date | string = new Date();

        if (seeYouAt.datetime) {
          try {
            reminderTime = new Date(seeYouAt.datetime);
          } catch {
            reminderTime = new Date();
          }
        }

        const description = [
          `Restaurant: ${seeYouAt.restaurant_name || "TBD"}`,
          seeYouAt.direction?.address_text && `Address: ${seeYouAt.direction.address_text}`,
          seeYouAt.datetime && `Date & Time: ${new Date(seeYouAt.datetime).toLocaleString()}`,
        ]
          .filter(Boolean)
          .join("\n");

        cardConfig = {
          type: "reminder",
          config: {
            title: convoMsg.content.title || "Reminder Set! 🔔",
            description: description || convoMsg.content.message || "",
            location: seeYouAt.restaurant_name && seeYouAt.direction
              ? {
                  name: seeYouAt.restaurant_name,
                  address: seeYouAt.direction.address_text || "",
                }
              : undefined,
            time: reminderTime,
            priority: "high" as const,
          },
        };
      }
      break;
    }

    default: {
      content = convoMsg.content.text || JSON.stringify(convoMsg.content);
      break;
    }
  }

  return {
    id: convoMsg.message_id,
    userId,
    userName: convoMsg.sender_name,
    content,
    role: isBot ? "assistant" : "user",
    timestamp,
    cardConfig,
  };
}

/**
 * Converts an array of conversation messages to group chat messages
 */
export function convertConvoMessagesToGroupChatMessages(
  convoMessages: ConvoMessage[],
  baseTimestamp?: number
): GroupChatMessage[] {
  const startTime = baseTimestamp || Date.now() - convoMessages.length * 60000; // Start from the past

  return convoMessages.map((msg, index) =>
    convertConvoMessageToGroupChatMessage(msg, startTime, index)
  );
}

/**
 * Converts session users from the convo format
 */
export function extractUsersFromConvoMessages(
  convoMessages: ConvoMessage[]
): Array<{ id: string; name: string; joinedAt: number }> {
  const userMap = new Map<string, { id: string; name: string; joinedAt: number }>();
  const baseTime = Date.now() - convoMessages.length * 60000;

  convoMessages.forEach((msg, index) => {
    const userId = msg.sender_id === 0 ? "burpla" : `user-${msg.sender_id}`;

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        id: userId,
        name: msg.sender_name,
        joinedAt: baseTime + index * 60000,
      });
    }
  });

  return Array.from(userMap.values());
}


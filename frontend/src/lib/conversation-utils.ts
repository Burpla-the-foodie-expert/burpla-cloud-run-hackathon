import type { InteractiveCardConfig } from "@/components/ai-elements/interactive-card";
import { getApiUrl } from "@/lib/api-config";

/**
 * Parse a Python dict string to JavaScript object
 */
function parsePythonDict(str: string): any {
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
}

/**
 * Convert backend recommendation card format to InteractiveCardConfig
 */
function convertRecommendationCard(
  data: any,
  userLocation?: { lat: number; lng: number } | null
): InteractiveCardConfig | undefined {
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
}

/**
 * Convert backend voting card format to InteractiveCardConfig
 */
function convertVotingCard(data: any): InteractiveCardConfig | undefined {
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
}

/**
 * Parse message content to extract card information
 * Returns both the cleaned message content and cardConfig if a card is found
 */
export function parseMessageForCard(
  messageContent: string,
  userLocation?: { lat: number; lng: number } | null
): { content: string; cardConfig?: InteractiveCardConfig } {
  let content = messageContent || "";
  let cardConfig: InteractiveCardConfig | undefined = undefined;

  // Try to parse the message as a Python dict string
  // Check if message looks like a Python dict (starts with { and contains 'type')
  if (
    content.trim().startsWith("{") &&
    (content.includes("'type'") || content.includes('"type"'))
  ) {
    const parsedData = parsePythonDict(content);
    if (parsedData) {
      // Check for recommendation card
      if (parsedData.type === "recommendation_card") {
        cardConfig = convertRecommendationCard(parsedData, userLocation);
        if (cardConfig) {
          // Set a user-friendly message content when we have a card
          content = "Here are some restaurant recommendations:";
        }
      }
      // Check for voting card
      else if (parsedData.type === "vote_card") {
        cardConfig = convertVotingCard(parsedData);
        if (cardConfig) {
          // Set a user-friendly message content when we have a voting card
          content = "Vote for your favorite restaurant:";
        }
      }
    }
  }

  return { content, cardConfig };
}

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

/**
 * Load messages from backend /get_session endpoint
 * Converts backend format to frontend format and parses card information
 */
export async function loadSessionMessagesFromBackend(
  sessionId: string,
  userLocation?: { lat: number; lng: number } | null
): Promise<Array<{
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: InteractiveCardConfig;
}>> {
  try {
    const backendUrl = getApiUrl(`/get_session?session_id=${encodeURIComponent(sessionId)}`);
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.warn(`Failed to load session ${sessionId} from backend:`, response.status);
      return [];
    }

    const backendMessages = await response.json();
    if (!Array.isArray(backendMessages)) {
      return [];
    }

    // Fetch user names for the session
    let userNamesMap = new Map<string, string>();
    try {
      const usersUrl = getApiUrl(`/get_session_users_info?session_id=${encodeURIComponent(sessionId)}`);
      const usersResponse = await fetch(usersUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (usersResponse.ok) {
        const usersInfo = await usersResponse.json();
        if (Array.isArray(usersInfo)) {
          usersInfo.forEach((user: any) => {
            if (user.user_id && user.name) {
              userNamesMap.set(user.user_id, user.name);
            }
          });
        }
      }
    } catch (error) {
      console.warn("Failed to load user names for session, will use fallback:", error);
    }

    // Convert backend format to frontend format
    return backendMessages.map((msg: any) => {
      // Backend format: { session_id, user_id, message_id, content, timestamp }
      // Frontend format: { id, userId, userName, content, role, timestamp, cardConfig? }
      const isBot = msg.user_id === "bot" || msg.user_id === "burpla";
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).getTime()
        : Date.now();

      // Get user name from map, or fallback to a formatted version of user_id
      let userName: string;
      if (isBot) {
        userName = "Burpla";
      } else {
        const userId = msg.user_id || "unknown";
        userName = userNamesMap.get(userId) || userId;
        // If still using userId, try to format it nicely (e.g., "user_001" -> "User 001")
        if (userName === userId && userId.startsWith("user_")) {
          const numPart = userId.replace("user_", "");
          userName = `User ${numPart}`;
        }
      }

      // Parse card information from bot messages
      let content = msg.content || "";
      let cardConfig: InteractiveCardConfig | undefined = undefined;

      if (isBot && content) {
        // Parse message content to extract card information
        const parsed = parseMessageForCard(content, userLocation);
        content = parsed.content;
        cardConfig = parsed.cardConfig;
      }

      return {
        id: msg.message_id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: msg.user_id || "unknown",
        userName,
        content,
        role: isBot ? ("assistant" as const) : ("user" as const),
        timestamp,
        ...(cardConfig && { cardConfig }), // Only include cardConfig if it exists
      };
    });
  } catch (error) {
    console.error(`Error loading messages from backend for session ${sessionId}:`, error);
    return [];
  }
}


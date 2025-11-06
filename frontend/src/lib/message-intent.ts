/**
 * Detects the intent of a user message to determine which interactive card to return
 */

export type MessageIntent =
  | "restaurant_recommendation"
  | "voting"
  | "reminder"
  | "general";

/**
 * Detects the intent from user message
 */
export function detectMessageIntent(message: string): MessageIntent {
  const lowerMessage = message.toLowerCase();

  // Restaurant recommendation keywords
  const restaurantKeywords = [
    "restaurant",
    "restaurants",
    "food",
    "eat",
    "eating",
    "dining",
    "cafe",
    "coffee",
    "bar",
    "lunch",
    "dinner",
    "breakfast",
    "recommend",
    "recommendation",
    "recommendations",
    "suggest",
    "suggestion",
    "find",
    "finding",
    "nearby",
    "place to eat",
    "places to eat",
    "where should",
    "where can",
    "where to",
    "good place",
    "good places",
    "best",
    "best place",
    "best places",
    "near me",
    "around here",
    "around",
    "cuisine",
    "pizza",
    "italian",
    "chinese",
    "mexican",
    "sushi",
    "seafood",
    "burger",
    "bbq",
    "steak",
    "thai",
    "japanese",
    "korean",
    "indian",
  ];

  // Voting keywords
  const votingKeywords = [
    "vote",
    "voting",
    "votes",
    "choose",
    "choosing",
    "decide",
    "decision",
    "which one",
    "which option",
    "which should",
    "pick",
    "picking",
    "select",
    "selection",
    "generate vote",
    "generate voting",
    "vote list",
    "voting list",
    "create vote",
    "create voting",
    "poll",
    "polls",
    "options",
    "preference",
    "prefer",
  ];

  // Reminder keywords
  const reminderKeywords = [
    "reminder",
    "remember",
    "set reminder",
    "schedule",
    "meeting",
    "appointment",
    "when",
    "time",
    "what time",
    "when should",
    "remind me",
    "set a reminder",
    "create reminder",
    "schedule",
    "calendar",
    "event",
  ];

  // Check for restaurant recommendation
  const hasRestaurantIntent =
    restaurantKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
    /find.*restaurant/i.test(message) ||
    /find.*place/i.test(message) ||
    /recommend.*place/i.test(message) ||
    /recommend.*restaurant/i.test(message) ||
    /suggest.*place/i.test(message) ||
    /suggest.*restaurant/i.test(message) ||
    /where.*eat/i.test(message) ||
    /where.*food/i.test(message) ||
    /where.*dine/i.test(message) ||
    /good.*place/i.test(message) ||
    /best.*place/i.test(message) ||
    /best.*restaurant/i.test(message) ||
    /place.*to.*eat/i.test(message) ||
    /places.*to.*eat/i.test(message) ||
    /what.*restaurant/i.test(message) ||
    /what.*place/i.test(message);

  // Check for voting intent
  const hasVotingIntent =
    votingKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
    /which.*should/i.test(message) ||
    /which.*one/i.test(message) ||
    /which.*option/i.test(message) ||
    /generate.*vote/i.test(message) ||
    /generate.*voting/i.test(message) ||
    /create.*vote/i.test(message) ||
    /create.*voting/i.test(message) ||
    /make.*vote/i.test(message) ||
    /show.*options/i.test(message);

  // Check for reminder intent
  const hasReminderIntent =
    reminderKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
    /set.*reminder/i.test(message) ||
    /remind.*me/i.test(message) ||
    /what.*time/i.test(message);

  // Priority: reminder > voting > restaurant > general
  if (hasReminderIntent) {
    return "reminder";
  }
  if (hasVotingIntent) {
    return "voting";
  }
  if (hasRestaurantIntent) {
    return "restaurant_recommendation";
  }

  return "general";
}

/**
 * Extracts location from message (if mentioned)
 */
export function extractLocation(message: string): {
  location?: string;
  coordinates?: { lat: number; lng: number };
} {
  // Try to extract location from message
  // Common patterns: "in Houston", "near NYC", "77083", etc.
  const locationPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, // "in Houston", "in New York"
    /near\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, // "near Houston"
    /\b\d{5}\b/, // ZIP code like "77083"
    /([A-Z][a-z]+\s*,\s*[A-Z]{2})/g, // "Houston, TX"
  ];

  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { location: match[0] };
    }
  }

  return {};
}

/**
 * Extracts time/date from message
 */
export function extractTime(message: string): {
  time?: string;
  date?: string;
} {
  // Patterns for time extraction
  const timePatterns = [
    /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/i, // "7:00 PM", "7pm"
    /\b(\d{1,2})\s*(am|pm|AM|PM)\b/i, // "7pm"
    /\b(at|around|by)\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i, // "at 7pm"
  ];

  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      return { time: match[0] };
    }
  }

  return {};
}


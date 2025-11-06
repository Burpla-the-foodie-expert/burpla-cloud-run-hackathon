import type { ConvoMessage } from "./conversation-utils";

/**
 * Loads the convo_sample.json data
 * In a real app, this would fetch from an API endpoint
 * For now, we'll import it directly or fetch it
 */
export async function loadConvoSample(): Promise<ConvoMessage[]> {
  try {
    // Try to fetch from the backend API first
    const response = await fetch("/api/conversation-sample");
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn("Failed to fetch from API, trying direct import:", error);
  }

  // Fallback: return empty array or import directly if needed
  // In production, you'd want to fetch this from an API endpoint
  return [];
}

/**
 * Example usage with static data (for development/stories)
 */
export const exampleConvoData: ConvoMessage[] = [
  {
    message_id: "msg_001",
    sender_id: 1,
    sender_name: "Huy Bui",
    type: "text",
    content: {
      text: "what is a good place to eat in Houston 77083",
    },
  },
  {
    message_id: "msg_002",
    sender_id: 0,
    sender_name: "Burpla",
    type: "text",
    content: {
      text: "Huy Bui, here are a few highly-rated sushi options in your area.",
    },
  },
  {
    message_id: "msg_003",
    sender_id: 2,
    sender_name: "Weber",
    type: "text",
    content: {
      text: "I dont like sushi.",
    },
  },
  {
    message_id: "msg_004",
    sender_id: 3,
    sender_name: "Huy Nguyen",
    type: "text",
    content: {
      text: "can we eat seafood",
    },
  },
  {
    message_id: "msg_005",
    sender_id: 1,
    sender_name: "Huy Bui",
    type: "text",
    content: {
      text: "Burpla, generate the vote list.",
    },
  },
  {
    message_id: "msg_006",
    sender_id: 0,
    sender_name: "Burpla",
    type: "vote_card",
    content: {
      text: "Here is the recommendation based on the conversation.",
      title: "Options to eat in Houston",
      vote_options: [
        {
          restaurant_id: "rest_A",
          restaurant_name: "The Spicy Crab Shack",
          description: "Top-rated Cajun seafood boil with outdoor seating.",
          image: "",
          review: "4.6/5.0 (2,100 reviews)",
          number_of_vote: 2,
          map: "https://maps.app.goo.gl/SpicyCrabShack",
        },
        {
          restaurant_id: "rest_B",
          restaurant_name: "Pappasito's Cantina",
          description: "Popular Tex-Mex spot with great margaritas.",
          image: "",
          review: "4.4/5.0 (5,500 reviews)",
          number_of_vote: 1,
          map: "https://maps.app.goo.gl/Pappasitos",
        },
        {
          restaurant_id: "rest_C",
          restaurant_name: "H-Town Burgers",
          description: "Simple, highly-rated local burger joint.",
          image: "",
          review: "4.8/5.0 (900 reviews)",
          number_of_vote: 0,
          map: "https://maps.app.goo.gl/HTownBurgers",
        },
      ],
    },
  },
  {
    message_id: "msg_007",
    sender_id: 1,
    sender_name: "Huy Bui",
    type: "text",
    content: {
      text: "What about time?",
    },
  },
  {
    message_id: "msg_008",
    sender_id: 2,
    sender_name: "Weber",
    type: "text",
    content: {
      text: "7pm is fine with me.",
    },
  },
  {
    message_id: "msg_009",
    sender_id: 3,
    sender_name: "Huy Nguyen",
    type: "text",
    content: {
      text: "Burpla set reminder.",
    },
  },
  {
    message_id: "msg_010",
    sender_id: 0,
    sender_name: "Burpla",
    type: "reminder_card",
    content: {
      title: "Dinner Confirmation",
      selected_restaurant_name: "The Spicy Crab Shack",
      time_selection: "7:00 PM CST",
      date_selection: "Friday, November 7th, 2025",
      list_of_people: ["Huy Bui", "Weber", "Huy Nguyen"],
      additional_notes: "A table for 3 has been tentatively reserved.",
    },
  },
  {
    message_id: "msg_011",
    sender_id: 0,
    sender_name: "Burpla",
    type: "end_card",
    content: {
      title: "Reminder Set! 🔔",
      message: "The reminder has been successfully sent to everyone in this chat.",
      see_you_at: {
        restaurant_name: "The Spicy Crab Shack",
        direction: {
          address_text: "123 Main St, Houston, TX 77083",
          google_map_hyperlink: "https://maps.app.goo.gl/SpicyCrabShack",
        },
        datetime: "2025-11-07T19:00:00-06:00",
      },
    },
  },
];


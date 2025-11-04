import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GroupChat } from "./group-chat";
import { useEffect } from "react";

import type { InteractiveCardConfig } from "./interactive-card";
import { exampleConvoData } from "@/lib/load-convo-sample";

// Define Message interface locally (matches group-chat.tsx)
interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  cardConfig?: InteractiveCardConfig;
}

// Mock wrapper component that provides initial messages
function GroupChatWithMock({
  initialMessages,
  initialUsers,
  sessionId,
  userName,
  userId,
  userLocation,
  convoData,
  loadFromConvo = false,
}: {
  initialMessages?: Message[];
  initialUsers?: Array<{ id: string; name: string; joinedAt: number }>;
  sessionId: string;
  userName: string;
  userId: string;
  userLocation?: { lat: number; lng: number } | null;
  convoData?: any[];
  loadFromConvo?: boolean;
}) {
  useEffect(() => {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch for session API
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      // Mock session API responses
      if (url.includes("/api/sessions")) {
        if (init?.method === "GET") {
          // For Storybook, always return all initial messages on first request
          // or messages after the lastMessageId if specified
          let lastMsgId = "";
          try {
            const urlStr = typeof input === "string" ? input : url;
            const fullUrl = urlStr.startsWith("http")
              ? urlStr
              : `http://localhost${urlStr}`;
            const urlObj = new URL(fullUrl);
            lastMsgId = urlObj.searchParams.get("lastMessageId") || "";
          } catch (e) {
            // Fallback: parse manually if URL parsing fails
            const match = url.match(/[?&]lastMessageId=([^&]*)/);
            if (match) lastMsgId = match[1];
          }

          let messagesToReturn = initialMessages || [];
          if (lastMsgId && initialMessages && initialMessages.length > 0) {
            // Return only messages after the lastMessageId
            const lastIndex = initialMessages.findIndex(
              (m) => m.id === lastMsgId
            );
            if (lastIndex >= 0 && lastIndex < initialMessages.length - 1) {
              messagesToReturn = initialMessages.slice(lastIndex + 1);
            } else {
              messagesToReturn = [];
            }
          }

          const mockData = {
            messages: messagesToReturn,
            users: initialUsers || [],
          };
          return new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (init?.method === "POST") {
          // Simulate successful message send
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // For chat API (AI responses)
      if (url.includes("/api/chat")) {
        // Simulate AI response
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "I'd be happy to help! What would you like to know?",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Fallback to original fetch
      return originalFetch(input, init);
    };

    // Restore original fetch on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, [initialMessages, initialUsers]);

  return (
    <GroupChat
      sessionId={sessionId}
      userName={userName}
      userId={userId}
      userLocation={userLocation}
      initialMessages={initialMessages}
      initialUsers={initialUsers}
      convoData={convoData}
      loadFromConvo={loadFromConvo}
    />
  );
}

const meta = {
  title: "Components/AI Elements/GroupChat",
  component: GroupChat,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A Discord-style group chat interface with session management. Supports multiple users in a session, mentions (@burpla for AI), and real-time message polling.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    sessionId: {
      control: "text",
      description: "Unique session identifier for the group chat",
    },
    userLocation: {
      control: "object",
      description: "User location coordinates for contextual AI responses",
    },
    userName: {
      control: "text",
      description: "Name of the current user",
    },
    userId: {
      control: "text",
      description: "Unique identifier for the current user",
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GroupChat>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock messages
function createMessages(
  overrides: Array<{
    userId: string;
    userName: string;
    content: string;
    role: "user" | "assistant";
    timestampOffset?: number; // seconds ago
    cardConfig?: InteractiveCardConfig;
  }>
): Message[] {
  const now = Date.now();
  return overrides.map((msg, index) => ({
    id: `msg-${index + 1}`,
    userId: msg.userId,
    userName: msg.userName,
    content: msg.content,
    role: msg.role,
    timestamp: now - (msg.timestampOffset || overrides.length - index) * 60000,
    cardConfig: msg.cardConfig,
  }));
}

// Helper to create mock users
function createUsers(users: Array<{ id: string; name: string }>) {
  const now = Date.now();
  return users.map((user, index) => ({
    id: user.id,
    name: user.name,
    joinedAt: now - (users.length - index) * 60000,
  }));
}

export const Default: Story = {
  args: {
    sessionId: "test-session-123",
    userName: "John Doe",
    userId: "user-1",
  },
  render: (args) => <GroupChatWithMock {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Basic group chat interface with a session ID. Users can send messages and mention @burpla to get AI responses.",
      },
    },
  },
};

export const MultipleUsersActive: Story = {
  args: {
    sessionId: "multi-user-session",
    userName: "Alice",
    userId: "user-alice",
    userLocation: { lat: 40.7128, lng: -74.006 },
  },
  render: () => (
    <GroupChatWithMock
      sessionId="multi-user-session"
      userName="Alice"
      userId="user-alice"
      userLocation={{ lat: 40.7128, lng: -74.006 }}
      initialMessages={createMessages([
        {
          userId: "user-alice",
          userName: "Alice",
          content: "Hey everyone! Anyone up for exploring the city today?",
          role: "user",
          timestampOffset: 20,
        },
        {
          userId: "user-bob",
          userName: "Bob",
          content: "I'm in! What did you have in mind?",
          role: "user",
          timestampOffset: 19,
        },
        {
          userId: "user-charlie",
          userName: "Charlie",
          content: "Count me in too! Just finished work",
          role: "user",
          timestampOffset: 18,
        },
        {
          userId: "user-diana",
          userName: "Diana",
          content: "Same here! What area are we thinking?",
          role: "user",
          timestampOffset: 17,
        },
        {
          userId: "user-alice",
          userName: "Alice",
          content: "Let's ask @burpla for some recommendations!",
          role: "user",
          timestampOffset: 16,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Great idea! Based on your location in NYC, I can suggest some fantastic spots. What kind of places are you interested in? Restaurants, parks, museums, or something else?",
          role: "assistant",
          timestampOffset: 15,
        },
        {
          userId: "user-bob",
          userName: "Bob",
          content: "I'm craving Italian food!",
          role: "user",
          timestampOffset: 14,
        },
        {
          userId: "user-charlie",
          userName: "Charlie",
          content: "I'd love to see a museum after lunch",
          role: "user",
          timestampOffset: 13,
        },
        {
          userId: "user-diana",
          userName: "Diana",
          content: "Both sound great! Maybe something in Central Park area?",
          role: "user",
          timestampOffset: 12,
        },
        {
          userId: "user-alice",
          userName: "Alice",
          content:
            "Yes! @burpla can you find us a route that hits all of that?",
          role: "user",
          timestampOffset: 11,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Perfect! I've found some excellent Italian restaurants near you. Here are my top recommendations:",
          role: "assistant",
          timestampOffset: 10,
          cardConfig: {
            type: "restaurant_recommendation",
            config: {
              title: "Italian Restaurants Near You",
              userLocation: { lat: 40.7128, lng: -74.006 },
              restaurants: [
                {
                  id: "rest-1",
                  name: "Bella Italia",
                  address: "123 West 54th Street, New York, NY 10019",
                  rating: 4.7,
                  userRatingCount: 1234,
                  priceLevel: 3,
                  distance: 800,
                  photoUri:
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=123456789",
                },
                {
                  id: "rest-2",
                  name: "La Trattoria",
                  address: "456 Broadway, New York, NY 10013",
                  rating: 4.5,
                  userRatingCount: 892,
                  priceLevel: 2,
                  distance: 1200,
                  photoUri:
                    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=987654321",
                },
                {
                  id: "rest-3",
                  name: "Cucina Rustica",
                  address: "789 Park Avenue, New York, NY 10021",
                  rating: 4.9,
                  userRatingCount: 567,
                  priceLevel: 4,
                  distance: 2100,
                  googleMapsUri: "https://maps.google.com/?cid=456789123",
                },
              ],
            },
          },
        },
        {
          userId: "user-alice",
          userName: "Alice",
          content: "Great! Which one should we choose? Let's vote!",
          role: "user",
          timestampOffset: 9,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content: "Perfect! Here's a voting card to help you decide:",
          role: "assistant",
          timestampOffset: 8,
          cardConfig: {
            type: "voting",
            config: {
              question: "Which Italian restaurant should we go to?",
              totalVotes: 4,
              allowVoting: true,
              onVote: (optionId) => {
                console.log("Voted for:", optionId);
                alert(`You voted for option: ${optionId}`);
              },
              options: [
                {
                  id: "rest-1",
                  restaurant_name: "Bella Italia",
                  description: "Popular Italian restaurant with great reviews",
                  review: "Excellent pasta and atmosphere!",
                  votes: 2,
                  number_of_vote: 2,
                  map: "https://maps.google.com/?cid=123456789",
                  location: "123 West 54th Street, New York, NY 10019",
                  rating: 4.7,
                  userRatingCount: 1234,
                },
                {
                  id: "rest-2",
                  restaurant_name: "La Trattoria",
                  description: "Cozy trattoria with authentic Italian cuisine",
                  review: "Best pizza in the area!",
                  votes: 1,
                  number_of_vote: 1,
                  map: "https://maps.google.com/?cid=987654321",
                  location: "456 Broadway, New York, NY 10013",
                  rating: 4.5,
                  userRatingCount: 892,
                },
                {
                  id: "rest-3",
                  restaurant_name: "Cucina Rustica",
                  description: "Upscale Italian dining experience",
                  review: "Amazing wine selection and fine dining!",
                  votes: 1,
                  number_of_vote: 1,
                  map: "https://maps.google.com/?cid=456789123",
                  location: "789 Park Avenue, New York, NY 10021",
                  rating: 4.9,
                  userRatingCount: 567,
                },
              ],
            },
          },
        },
        {
          userId: "user-bob",
          userName: "Bob",
          content: "Bella Italia it is! What time should we meet?",
          role: "user",
          timestampOffset: 7,
        },
        {
          userId: "user-charlie",
          userName: "Charlie",
          content: "I can be there by 6:30pm",
          role: "user",
          timestampOffset: 6,
        },
        {
          userId: "user-alice",
          userName: "Alice",
          content: "Works for me! Diana, can you make it by then?",
          role: "user",
          timestampOffset: 5,
        },
        {
          userId: "user-diana",
          userName: "Diana",
          content: "Yep, 6:30 works! @burpla can you set a reminder?",
          role: "user",
          timestampOffset: 4,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Perfect! I've set a reminder for your dinner reservation at Bella Italia.",
          role: "assistant",
          timestampOffset: 3,
          cardConfig: {
            type: "reminder",
            config: {
              title: "Dinner at Bella Italia",
              description:
                "Meeting the group for Italian dinner. The restaurant has outdoor seating if the weather's nice!",
              location: {
                name: "Bella Italia",
                address: "123 West 54th Street, New York, NY 10019",
                coordinates: { lat: 40.7128, lng: -74.006 },
              },
              time: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
              priority: "high",
            },
          },
        },
        {
          userId: "user-charlie",
          userName: "Charlie",
          content: "Awesome, thanks! Can't wait",
          role: "user",
          timestampOffset: 2,
        },
        {
          userId: "user-alice",
          userName: "Alice",
          content: "Perfect! See everyone at 6:30! 🎉",
          role: "user",
          timestampOffset: 1,
        },
      ])}
      initialUsers={createUsers([
        { id: "user-alice", name: "Alice" },
        { id: "user-bob", name: "Bob" },
        { id: "user-charlie", name: "Charlie" },
        { id: "user-diana", name: "Diana" },
      ])}
    />
  ),

  parameters: {
    docs: {
      description: {
        story:
          "Active group chat with multiple users discussing plans and getting AI assistance. Shows all three interactive card types: restaurant recommendations, voting cards, and reminder cards. Demonstrates how different users' messages are grouped and displayed with a natural conversation flow between 4 active participants.",
      },
    },
  },
};

export const WithBotConversation: Story = {
  args: {
    sessionId: "bot-conversation",
    userName: "Sarah",
    userId: "user-sarah",
    userLocation: { lat: 37.7749, lng: -122.4194 },
  },
  render: () => (
    <GroupChatWithMock
      sessionId="bot-conversation"
      userName="Sarah"
      userId="user-sarah"
      userLocation={{ lat: 37.7749, lng: -122.4194 }}
      initialMessages={createMessages([
        {
          userId: "user-sarah",
          userName: "Sarah",
          content: "@burpla Can you help me find a coffee shop near me?",
          role: "user",
          timestampOffset: 8,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Absolutely! Here are some great coffee shop options near you:",
          role: "assistant",
          timestampOffset: 7,
          cardConfig: {
            type: "restaurant_recommendation",
            config: {
              title: "Coffee Shops Near You",
              userLocation: { lat: 37.7749, lng: -122.4194 },
              restaurants: [
                {
                  id: "coffee-1",
                  name: "Blue Bottle Coffee",
                  address: "315 Linden St, San Francisco, CA 94102",
                  rating: 4.6,
                  userRatingCount: 1847,
                  priceLevel: 2,
                  distance: 480,
                  photoUri:
                    "https://images.unsplash.com/photo-1511920170033-839cf44d2a39?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=bluebottle123",
                },
                {
                  id: "coffee-2",
                  name: "Ritual Coffee Roasters",
                  address: "1026 Valencia St, San Francisco, CA 94110",
                  rating: 4.5,
                  userRatingCount: 1234,
                  priceLevel: 2,
                  distance: 960,
                  photoUri:
                    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=ritual123",
                },
              ],
            },
          },
        },
        {
          userId: "user-mike",
          userName: "Mike",
          content: "Ooh, I love Blue Bottle! Their cold brew is amazing",
          role: "user",
          timestampOffset: 6,
        },
        {
          userId: "user-sarah",
          userName: "Sarah",
          content: "Thanks @burpla! Which one should we go to?",
          role: "user",
          timestampOffset: 5,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content: "Let's vote on it!",
          role: "assistant",
          timestampOffset: 4,
          cardConfig: {
            type: "voting",
            config: {
              question: "Which coffee shop should we visit?",
              totalVotes: 2,
              allowVoting: true,
              onVote: (optionId) => {
                console.log("Voted for:", optionId);
                alert(`You voted for option: ${optionId}`);
              },
              options: [
                {
                  id: "coffee-1",
                  restaurant_name: "Blue Bottle Coffee",
                  description: "Premium coffee with excellent cold brew",
                  review: "Best cold brew in the city!",
                  votes: 1,
                  number_of_vote: 1,
                  map: "https://maps.google.com/?cid=bluebottle123",
                  location: "315 Linden St, San Francisco, CA 94102",
                  rating: 4.6,
                  userRatingCount: 1847,
                },
                {
                  id: "coffee-2",
                  restaurant_name: "Ritual Coffee Roasters",
                  description: "Local roaster with great atmosphere",
                  review: "Amazing coffee and friendly staff!",
                  votes: 1,
                  number_of_vote: 1,
                  map: "https://maps.google.com/?cid=ritual123",
                  location: "1026 Valencia St, San Francisco, CA 94110",
                  rating: 4.5,
                  userRatingCount: 1234,
                },
              ],
            },
          },
        },
        {
          userId: "user-mike",
          userName: "Mike",
          content: "I'm in! Meet you there in 15?",
          role: "user",
          timestampOffset: 3,
        },
        {
          userId: "user-sarah",
          userName: "Sarah",
          content: "Perfect! @burpla can you set a reminder?",
          role: "user",
          timestampOffset: 2,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content: "Great choice! I've set a reminder for your coffee meetup.",
          role: "assistant",
          timestampOffset: 1,
          cardConfig: {
            type: "reminder",
            config: {
              title: "Coffee Meetup",
              description:
                "Meeting Mike at Blue Bottle Coffee for some great coffee and conversation!",
              location: {
                name: "Blue Bottle Coffee",
                address: "315 Linden St, San Francisco, CA 94102",
                coordinates: { lat: 37.7749, lng: -122.4194 },
              },
              time: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
              priority: "medium",
            },
          },
        },
      ])}
      initialUsers={createUsers([
        { id: "user-sarah", name: "Sarah" },
        { id: "user-mike", name: "Mike" },
      ])}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Shows a conversation where users interact with the AI bot (@burpla) and each other. Demonstrates all three interactive card types: restaurant recommendations for coffee shops, voting cards to decide, and reminder cards for the meetup.",
      },
    },
  },
};

export const LongConversation: Story = {
  args: {
    sessionId: "long-conversation",
    userName: "David",
    userId: "user-david",
  },
  render: () => (
    <GroupChatWithMock
      sessionId="long-conversation"
      userName="David"
      userId="user-david"
      initialMessages={createMessages([
        {
          userId: "user-david",
          userName: "David",
          content: "Planning a weekend trip. Any suggestions?",
          role: "user",
          timestampOffset: 15,
        },
        {
          userId: "user-emma",
          userName: "Emma",
          content: "Where are you thinking of going?",
          role: "user",
          timestampOffset: 14,
        },
        {
          userId: "user-david",
          userName: "David",
          content: "Not sure yet! Maybe @burpla has some ideas?",
          role: "user",
          timestampOffset: 13,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "I'd be happy to help! What kind of experience are you looking for? City exploration, nature, beaches, or something else?",
          role: "assistant",
          timestampOffset: 12,
        },
        {
          userId: "user-david",
          userName: "David",
          content: "Something with both nature and good food",
          role: "user",
          timestampOffset: 11,
        },
        {
          userId: "user-frank",
          userName: "Frank",
          content:
            "I went to Yosemite last month - amazing hiking and great food options nearby!",
          role: "user",
          timestampOffset: 10,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Yosemite is fantastic! If you're open to other options, I can also suggest places like Lake Tahoe (great hiking + restaurants) or Big Sur (coastal views + excellent dining). What's your travel radius?",
          role: "assistant",
          timestampOffset: 9,
        },
        {
          userId: "user-david",
          userName: "David",
          content: "Within 3 hours drive would be ideal",
          role: "user",
          timestampOffset: 8,
        },
        {
          userId: "user-emma",
          userName: "Emma",
          content: "Lake Tahoe sounds perfect for a weekend!",
          role: "user",
          timestampOffset: 7,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Lake Tahoe is about 3.5 hours away and has excellent options! I can recommend specific trails and restaurants if you'd like. Would you like me to create an itinerary?",
          role: "assistant",
          timestampOffset: 6,
        },
        {
          userId: "user-david",
          userName: "David",
          content: "Yes please! That would be amazing",
          role: "user",
          timestampOffset: 5,
        },
        {
          userId: "user-frank",
          userName: "Frank",
          content: "Let me know if you want company! I'm always up for a trip",
          role: "user",
          timestampOffset: 4,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Great! I'll put together a detailed itinerary for Lake Tahoe with hiking trails, restaurant recommendations, and timing. I'll share it in a moment!",
          role: "assistant",
          timestampOffset: 3,
        },
      ])}
      initialUsers={createUsers([
        { id: "user-david", name: "David" },
        { id: "user-emma", name: "Emma" },
        { id: "user-frank", name: "Frank" },
      ])}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A longer conversation thread showing multiple users and bot interactions over time. Demonstrates message grouping and chronological flow.",
      },
    },
  },
};

export const WithLocation: Story = {
  args: {
    sessionId: "test-session-456",
    userName: "Jane Smith",
    userId: "user-2",
    userLocation: {
      lat: 37.7749,
      lng: -122.4194,
    },
  },
  render: () => (
    <GroupChatWithMock
      sessionId="test-session-456"
      userName="Jane Smith"
      userId="user-2"
      userLocation={{
        lat: 37.7749,
        lng: -122.4194,
      }}
      initialMessages={createMessages([
        {
          userId: "user-2",
          userName: "Jane Smith",
          content: "@burpla What's around here?",
          role: "user",
          timestampOffset: 5,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Based on your location in San Francisco, you're near some great spots! There's Golden Gate Park (1.2 miles), several excellent restaurants in the Mission District (0.8 miles), and the Golden Gate Bridge is about 4 miles away. What interests you most?",
          role: "assistant",
          timestampOffset: 4,
        },
      ])}
      initialUsers={createUsers([{ id: "user-2", name: "Jane Smith" }])}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Group chat with user location enabled for location-aware AI responses.",
      },
    },
  },
};

export const EmptyChat: Story = {
  args: {
    sessionId: "empty-session",
    userName: "New User",
    userId: "user-new",
  },
  render: () => (
    <GroupChatWithMock
      sessionId="empty-session"
      userName="New User"
      userId="user-new"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Empty chat state showing the welcome message.",
      },
    },
  },
};

// Comprehensive story with all interactive card types matching convo_sample.json context
export const WithAllInteractiveCards: Story = {
  args: {
    sessionId: "houston-dining-session",
    userName: "Huy Bui",
    userId: "user-huy-bui",
    userLocation: { lat: 29.7604, lng: -95.3698 }, // Houston, TX coordinates
  },
  render: () => (
    <GroupChatWithMock
      sessionId="houston-dining-session"
      userName="Huy Bui"
      userId="user-huy-bui"
      userLocation={{ lat: 29.7604, lng: -95.3698 }}
      initialMessages={createMessages([
        {
          userId: "user-huy-bui",
          userName: "Huy Bui",
          content: "what is a good place to eat in Houston 77083",
          role: "user",
          timestampOffset: 11,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Huy Bui, here are a few highly-rated sushi options in your area.",
          role: "assistant",
          timestampOffset: 10,
          cardConfig: {
            type: "restaurant_recommendation",
            config: {
              title: "Top Restaurants in Houston 77083",
              userLocation: { lat: 29.7604, lng: -95.3698 },
              restaurants: [
                {
                  id: "rest-1",
                  name: "Uchi Houston",
                  address: "904 Westheimer Rd, Houston, TX 77006",
                  rating: 4.7,
                  userRatingCount: 2847,
                  priceLevel: 4,
                  distance: 3500,
                  photoUri:
                    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=123456789",
                },
                {
                  id: "rest-2",
                  name: "Kata Robata",
                  address: "3600 Kirby Dr, Houston, TX 77098",
                  rating: 4.6,
                  userRatingCount: 1923,
                  priceLevel: 3,
                  distance: 4200,
                  photoUri:
                    "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=987654321",
                },
                {
                  id: "rest-3",
                  name: "MF Sushi",
                  address: "4306 Yoakum Blvd, Houston, TX 77006",
                  rating: 4.8,
                  userRatingCount: 1567,
                  priceLevel: 4,
                  distance: 3800,
                  photoUri:
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop",
                  googleMapsUri: "https://maps.google.com/?cid=456789123",
                },
              ],
            },
          },
        },
        {
          userId: "user-weber",
          userName: "Weber",
          content: "I dont like sushi.",
          role: "user",
          timestampOffset: 9,
        },
        {
          userId: "user-huy-nguyen",
          userName: "Huy Nguyen",
          content: "can we eat seafood",
          role: "user",
          timestampOffset: 8,
        },
        {
          userId: "user-huy-bui",
          userName: "Huy Bui",
          content: "Burpla, generate the vote list.",
          role: "user",
          timestampOffset: 7,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content: "Here is the recommendation based on the conversation.",
          role: "assistant",
          timestampOffset: 6,
          cardConfig: {
            type: "voting",
            config: {
              question: "Options to eat in Houston",
              totalVotes: 3,
              allowVoting: true,
              onVote: (optionId) => {
                console.log("Voted for:", optionId);
                alert(`You voted for option: ${optionId}`);
              },
              options: [
                {
                  id: "rest_A",
                  restaurant_id: "rest_A",
                  restaurant_name: "The Spicy Crab Shack",
                  description:
                    "Top-rated Cajun seafood boil with outdoor seating.",
                  review: "4.6/5.0 (2,100 reviews)",
                  number_of_vote: 2,
                  votes: 2,
                  map: "https://maps.app.goo.gl/SpicyCrabShack",
                  location: "123 Main St, Houston, TX 77083",
                  rating: 4.6,
                  userRatingCount: 2100,
                },
                {
                  id: "rest_B",
                  restaurant_id: "rest_B",
                  restaurant_name: "Pappasito's Cantina",
                  description: "Popular Tex-Mex spot with great margaritas.",
                  review: "4.4/5.0 (5,500 reviews)",
                  number_of_vote: 1,
                  votes: 1,
                  map: "https://maps.app.goo.gl/Pappasitos",
                  location: "456 Commerce St, Houston, TX 77002",
                  rating: 4.4,
                  userRatingCount: 5500,
                },
                {
                  id: "rest_C",
                  restaurant_id: "rest_C",
                  restaurant_name: "H-Town Burgers",
                  description: "Simple, highly-rated local burger joint.",
                  review: "4.8/5.0 (900 reviews)",
                  number_of_vote: 0,
                  votes: 0,
                  map: "https://maps.app.goo.gl/HTownBurgers",
                  location: "789 Elm St, Houston, TX 77083",
                  rating: 4.8,
                  userRatingCount: 900,
                },
              ],
            },
          },
        },
        {
          userId: "user-huy-bui",
          userName: "Huy Bui",
          content: "What about time?",
          role: "user",
          timestampOffset: 5,
        },
        {
          userId: "user-weber",
          userName: "Weber",
          content: "7pm is fine with me.",
          role: "user",
          timestampOffset: 4,
        },
        {
          userId: "user-huy-nguyen",
          userName: "Huy Nguyen",
          content: "Burpla set reminder.",
          role: "user",
          timestampOffset: 3,
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "I've set up a reminder for your dinner reservation. A table for 3 has been tentatively reserved at The Spicy Crab Shack.",
          role: "assistant",
          timestampOffset: 2,
          cardConfig: {
            type: "reminder",
            config: {
              title: "Dinner Confirmation",
              description:
                "A table for 3 has been tentatively reserved. See you at The Spicy Crab Shack!",
              location: {
                name: "The Spicy Crab Shack",
                address: "123 Main St, Houston, TX 77083",
                coordinates: { lat: 29.7604, lng: -95.3698 },
              },
              time: new Date("2025-11-07T19:00:00-06:00"), // Friday, November 7th, 2025 at 7:00 PM CST
              priority: "high",
            },
          },
        },
        {
          userId: "burpla",
          userName: "Burpla",
          content:
            "Reminder Set! 🔔\n\nThe reminder has been successfully sent to everyone in this chat.",
          role: "assistant",
          timestampOffset: 1,
        },
      ])}
      initialUsers={createUsers([
        { id: "user-huy-bui", name: "Huy Bui" },
        { id: "user-weber", name: "Weber" },
        { id: "user-huy-nguyen", name: "Huy Nguyen" },
      ])}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Complete conversation flow matching convo_sample.json context. Shows all three interactive card types: restaurant recommendations, voting cards, and reminder cards. Demonstrates a real-world scenario where users discuss dining options, vote on restaurants, and set reminders.",
      },
    },
  },
};

// Story using convo_sample.json data format
export const WithConvoSampleData: Story = {
  args: {
    sessionId: "houston-convo-sample",
    userName: "Huy Bui",
    userId: "user-1",
    userLocation: { lat: 29.7604, lng: -95.3698 }, // Houston, TX coordinates
  },
  render: (args) => (
    <GroupChatWithMock
      {...args}
      convoData={exampleConvoData}
      loadFromConvo={true}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Group chat loaded from convo_sample.json format. Shows the complete integration of the convo_sample.json data model with vote cards, reminder cards, and text messages. This demonstrates how the component handles all message types from the backend conversation format.",
      },
    },
  },
};

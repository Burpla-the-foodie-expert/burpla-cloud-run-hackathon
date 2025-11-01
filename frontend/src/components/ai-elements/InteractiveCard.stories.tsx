import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InteractiveCard } from "./interactive-card";
import type { InteractiveCardConfig } from "./interactive-card";

const meta = {
  title: "Components/AI Elements/InteractiveCard",
  component: InteractiveCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "An interactive card component that supports different card types: restaurant recommendations, voting cards, and reminder cards. Designed to display rich content within the Discord-style chat interface.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    cardConfig: {
      description: "Configuration object that determines the card type and content",
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          backgroundColor: "#36393f",
          padding: "2rem",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InteractiveCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Restaurant Recommendation Story
export const RestaurantRecommendations: Story = {
  args: {
    cardConfig: {
      type: "restaurant_recommendation",
      config: {
        title: "Top Italian Restaurants Near You",
        userLocation: {
          lat: 40.7128,
          lng: -74.006,
        },
        restaurants: [
          {
            id: "1",
            name: "Bella Italia",
            address: "123 West 54th Street, New York, NY 10019",
            rating: 4.7,
            userRatingCount: 1234,
            priceLevel: 3,
            distance: 450,
            photoUri:
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop",
            mapUri: "https://maps.google.com/?cid=123456789",
            placeId: "ChIJ123456789",
            types: ["restaurant", "italian_restaurant"],
          },
          {
            id: "2",
            name: "La Trattoria",
            address: "456 Broadway, New York, NY 10013",
            rating: 4.5,
            userRatingCount: 892,
            priceLevel: 2,
            distance: 1200,
            photoUri:
              "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop",
            mapUri: "https://maps.google.com/?cid=987654321",
            placeId: "ChIJ987654321",
            types: ["restaurant", "italian_restaurant"],
          },
          {
            id: "3",
            name: "Cucina Rustica",
            address: "789 Park Avenue, New York, NY 10021",
            rating: 4.9,
            userRatingCount: 567,
            priceLevel: 4,
            distance: 2100,
            mapUri: "https://maps.google.com/?cid=456789123",
            placeId: "ChIJ456789123",
            types: ["restaurant", "italian_restaurant"],
          },
        ],
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Displays a list of restaurant recommendations with ratings, distance from user location, price levels, and links to maps. Restaurants are automatically sorted by distance.",
      },
    },
  },
};

export const RestaurantRecommendationsWithoutLocation: Story = {
  args: {
    cardConfig: {
      type: "restaurant_recommendation",
      config: {
        title: "Popular Restaurants",
        restaurants: [
          {
            id: "1",
            name: "The Gourmet Kitchen",
            address: "123 Main Street, San Francisco, CA 94102",
            rating: 4.8,
            userRatingCount: 2345,
            priceLevel: 3,
            photoUri:
              "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=400&fit=crop",
          },
          {
            id: "2",
            name: "Ocean View Bistro",
            address: "456 Ocean Drive, San Francisco, CA 94133",
            rating: 4.6,
            userRatingCount: 1567,
            priceLevel: 2,
          },
        ],
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Restaurant recommendations without user location - distances won't be calculated or displayed.",
      },
    },
  },
};

// Voting Card Story
export const VotingCard: Story = {
  args: {
    cardConfig: {
      type: "voting",
      config: {
        question: "Where should we go for dinner?",
        totalVotes: 15,
        allowVoting: true,
        onVote: (optionId) => {
          console.log("Voted for:", optionId);
          alert(`You voted for option: ${optionId}`);
        },
        options: [
          {
            id: "option-1",
            name: "Bella Italia",
            restaurant_name: "Bella Italia",
            description: "Authentic Italian cuisine with a cozy atmosphere",
            review: "Best pasta in the city! The service was excellent.",
            votes: 8,
            image:
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop",
            map: "https://maps.google.com/?cid=123456789",
          },
          {
            id: "option-2",
            name: "Sushi Palace",
            restaurant_name: "Sushi Palace",
            description: "Fresh sushi and Japanese dishes",
            review: "Amazing quality and presentation. Highly recommend!",
            votes: 5,
            image:
              "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=400&fit=crop",
            map: "https://maps.google.com/?cid=987654321",
          },
          {
            id: "option-3",
            name: "Burger House",
            restaurant_name: "Burger House",
            description: "Gourmet burgers and craft beers",
            review: "Great burgers and friendly staff!",
            votes: 2,
            image:
              "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop",
            map: "https://maps.google.com/?cid=456789123",
          },
        ],
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story:
          "A voting card displaying multiple restaurant options with vote counts, percentages, and progress bars. Options are sorted by vote count. Supports voting interaction when enabled.",
      },
    },
  },
};

export const VotingCardReadOnly: Story = {
  args: {
    cardConfig: {
      type: "voting",
      config: {
        question: "Which activity do you prefer?",
        totalVotes: 42,
        allowVoting: false,
        options: [
          {
            id: "option-1",
            name: "Hiking",
            description: "Explore nature trails",
            votes: 25,
          },
          {
            id: "option-2",
            name: "Beach Day",
            description: "Relax at the beach",
            votes: 12,
          },
          {
            id: "option-3",
            name: "Museum Visit",
            description: "Cultural exploration",
            votes: 5,
          },
        ],
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story:
          "A read-only voting card without voting functionality. Shows results only.",
      },
    },
  },
};

// Reminder Card Stories
export const ReminderCard: Story = {
  args: {
    cardConfig: {
      type: "reminder",
      config: {
        title: "Dinner Reservation",
        description:
          "Meet the team for dinner at Bella Italia. Make sure to arrive 10 minutes early to check in.",
        location: {
          name: "Bella Italia",
          address: "123 West 54th Street, New York, NY 10019",
          coordinates: {
            lat: 40.7128,
            lng: -74.006,
          },
        },
        time: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        priority: "high",
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story:
          "A reminder card with location, time, and details. Shows formatted time, time until event, and priority indicator. Includes a link to open location in Google Maps.",
      },
    },
  },
};

export const ReminderCardLowPriority: Story = {
  args: {
    cardConfig: {
      type: "reminder",
      config: {
        title: "Weekend Planning",
        description:
          "Remember to check the weather forecast and plan outdoor activities accordingly.",
        location: {
          name: "Central Park",
          address: "Central Park, New York, NY 10024",
        },
        time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        priority: "low",
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story: "A low-priority reminder without coordinates.",
      },
    },
  },
};

export const ReminderCardWithoutLocation: Story = {
  args: {
    cardConfig: {
      type: "reminder",
      config: {
        title: "Team Meeting",
        description:
          "Weekly standup meeting to discuss project progress and blockers.",
        time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        priority: "medium",
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story: "A reminder card without location information.",
      },
    },
  },
};

// Past Reminder
export const PastReminder: Story = {
  args: {
    cardConfig: {
      type: "reminder",
      config: {
        title: "Conference Call",
        description: "Quarterly review meeting with stakeholders.",
        time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        priority: "medium",
      },
    } as InteractiveCardConfig,
  },
  parameters: {
    docs: {
      description: {
        story: "A reminder that has already passed (shows 'ago' in time display).",
      },
    },
  },
};

// All Card Types Together
export const AllCardTypes: Story = {
  render: () => (
    <div className="space-y-4">
      <InteractiveCard
        cardConfig={{
          type: "restaurant_recommendation",
          config: {
            title: "Quick Lunch Options",
            restaurants: [
              {
                id: "1",
                name: "Fast Bites",
                address: "123 Main St",
                rating: 4.5,
                userRatingCount: 200,
                priceLevel: 1,
                distance: 300,
              },
            ],
          },
        }}
      />
      <InteractiveCard
        cardConfig={{
          type: "voting",
          config: {
            question: "What's for lunch?",
            totalVotes: 10,
            options: [
              {
                id: "1",
                name: "Option A",
                votes: 6,
              },
              {
                id: "2",
                name: "Option B",
                votes: 4,
              },
            ],
          },
        }}
      />
      <InteractiveCard
        cardConfig={{
          type: "reminder",
          config: {
            title: "Quick Reminder",
            description: "Don't forget the meeting!",
            time: new Date(Date.now() + 60 * 60 * 1000),
            priority: "medium",
          },
        }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates all three card types displayed together in sequence.",
      },
    },
  },
};


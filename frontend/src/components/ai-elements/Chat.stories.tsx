import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chat } from "./chat";

const meta = {
  title: "Components/AI Elements/Chat",
  component: Chat,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A simple chat interface component using the `useChat` hook from `ai/react`. This is a basic chat implementation with a clean, modern UI. Requires a running API endpoint at `/api/chat`.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "800px", height: "700px", padding: "20px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Basic chat interface in an empty state. Users can start typing to begin a conversation.",
      },
    },
  },
};

export const WithMessages: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Chat interface with conversation history. Messages are displayed in a conversation format with user messages on the right and assistant messages on the left.",
      },
    },
    mockServiceWorker: {
      handlers: [],
    },
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: "discord-darker",
    },
    docs: {
      description: {
        story:
          "Chat component with dark background to demonstrate dark mode styling.",
      },
    },
  },
};

export const LightMode: Story = {
  parameters: {
    backgrounds: {
      default: "white",
    },
    docs: {
      description: {
        story: "Chat component on a light background.",
      },
    },
  },
};

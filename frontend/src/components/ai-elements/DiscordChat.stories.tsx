import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DiscordChat } from './discord-chat';

const meta = {
  title: 'Components/AI Elements/DiscordChat',
  component: DiscordChat,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A Discord-style chat interface with AI assistant integration. Supports user location for contextual responses. This component uses the `useChat` hook from `ai/react` which requires a running API endpoint.',
      },
    },
    mockServiceWorker: {
      handlers: [],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    userLocation: {
      control: 'object',
      description: 'User location coordinates for contextual AI responses',
    },
    userName: {
      control: 'text',
      description: 'Name of the user',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DiscordChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userName: 'John Doe',
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic chat interface without location data. The component will prompt for location permission when needed.',
      },
    },
  },
};

export const WithLocation: Story = {
  args: {
    userName: 'Jane Smith',
    userLocation: {
      lat: 37.7749,
      lng: -122.4194,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Chat interface with user location provided. This enables location-aware AI responses.',
      },
    },
  },
};

export const LongUserName: Story = {
  args: {
    userName: 'Christopher Alexander',
    userLocation: {
      lat: 40.7128,
      lng: -74.0060,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates how the component handles longer user names in avatars and display.',
      },
    },
  },
};

export const ShortUserName: Story = {
  args: {
    userName: 'AI',
    userLocation: {
      lat: 34.0522,
      lng: -118.2437,
    },
  },
};


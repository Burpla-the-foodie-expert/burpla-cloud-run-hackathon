import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SessionManager } from './session-manager';
import { fn } from 'storybook/test';

const meta = {
  title: 'Components/AI Elements/SessionManager',
  component: SessionManager,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A session management component that allows users to create new chat sessions or join existing ones. Displays session information and provides copy link functionality.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    sessionId: {
      control: 'text',
      description: 'Current session ID (null for no session)',
    },
    userName: {
      control: 'text',
      description: 'Name of the user',
    },
    onSessionChange: {
      action: 'session-changed',
      description: 'Callback fired when session is created or joined',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', minHeight: '400px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SessionManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
  args: {
    sessionId: null,
    userName: 'John Doe',
    onSessionChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the session creation/join modal when no session exists. Users can create a new session or join an existing one by entering a session ID.',
      },
    },
  },
};

export const WithSession: Story = {
  args: {
    sessionId: 'test-session-123',
    userName: 'Jane Smith',
    onSessionChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the session header bar when a session is active. Includes session ID display and copy link functionality.',
      },
    },
  },
};

export const LongSessionId: Story = {
  args: {
    sessionId: 'very-long-session-identifier-for-testing-purposes',
    userName: 'Alice',
    onSessionChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates how the component handles longer session IDs.',
      },
    },
  },
};

export const ShortUserName: Story = {
  args: {
    sessionId: 'session-abc',
    userName: 'AI',
    onSessionChange: fn(),
  },
};

export const LongUserName: Story = {
  args: {
    sessionId: 'session-xyz',
    userName: 'Christopher Alexander',
    onSessionChange: fn(),
  },
};


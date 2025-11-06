# Frontend - Next.js with Vercel AI SDK

This is a Next.js application with Vercel AI SDK and AI elements integrated.

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env.local` file and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Next.js 14 with App Router
- Vercel AI SDK (`ai` package) with React hooks (`ai/react`)
- OpenAI integration (`@ai-sdk/openai`)
- Chat component with streaming support
- Tailwind CSS for styling

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts      # API route for chat
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   └── ai-elements/
│   │       └── chat.tsx          # Chat component using AI SDK
│   └── lib/
│       └── utils.ts              # Utility functions
├── package.json
├── tsconfig.json
└── next.config.js
```

## AI SDK Components

The project includes a chat component (`src/components/ai-elements/chat.tsx`) that demonstrates:
- Using `useChat` hook from `ai/react`
- Streaming responses from the API
- Message rendering with user and assistant roles


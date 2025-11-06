import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSessionUsers, buildSystemMessage } from '@/lib/session-store'

// Allow streaming responses up to 30 seconds
export const runtime = 'edge'
export const maxDuration = 30

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Missing OPENAI_API_KEY environment variable. Please add it to your .env.local file.'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const { messages, location, userName, sessionId } = await req.json()

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages must be an array' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get session users for context if sessionId provided
    const sessionUsers = sessionId ? getSessionUsers(sessionId) : undefined;

    // Build system message with user context and session information
    const systemMessage = buildSystemMessage(
      userName,
      location ? { lat: location.latitude, lng: location.longitude } : undefined,
      sessionUsers
    );

    // Ensure system message is at the beginning of messages array
    const messagesWithContext = [
      { role: 'system' as const, content: systemMessage },
      ...messages
    ]

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: messagesWithContext,
    })

    return result.toAIStreamResponse()
  } catch (error: any) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}


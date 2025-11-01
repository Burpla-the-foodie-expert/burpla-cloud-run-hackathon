import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

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

    const { messages, location, userName } = await req.json()

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

    // Build system message with user context
    let systemMessage = 'You are Burpla, a helpful AI assistant. Your name is @burpla. When users mention "@burpla" in their messages, they are addressing you directly.';

    if (userName) {
      systemMessage += ` The user's name is ${userName}.`;
    }

    if (location) {
      systemMessage += ` The user's current location is ${location.latitude}, ${location.longitude}. Use this information to provide location-based recommendations, calculate distances, and suggest nearby places.`;
    }

    systemMessage += ' Always respond as Burpla when users mention you with @burpla.';

    // Ensure system message is at the beginning of messages array
    const messagesWithContext = [
      { role: 'system', content: systemMessage },
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


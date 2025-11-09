'use client'

import { useState, useCallback } from 'react'
import { Bot, User } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatProps {
  userId: string
  sessionId: string
  userName?: string
}

export function Chat({ userId, sessionId, userName = 'User' }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      const messageContent = input.trim()
      setInput('')
      setIsLoading(true)

      const messageId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`

      // Add user message optimistically
      const userMessage: Message = {
        id: messageId,
        role: 'user',
        content: messageContent,
      }
      setMessages((prev) => [...prev, userMessage])

      try {
        // Send message to /chat/sent endpoint
        const backendUrl = getApiUrl('/chat/sent')
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            message: messageContent,
            session_id: sessionId,
            is_to_agent: true,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // Add bot response
          const botMessage: Message = {
            id: data.message_id || `bot-${Date.now()}`,
            role: 'assistant',
            content: data.message || 'No response',
          }
          setMessages((prev) => [...prev, botMessage])
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.detail || errorData.error || 'Failed to get response'
          )
        }
      } catch (error: any) {
        console.error('Failed to send message:', error)
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${
            error.message || 'Failed to send message. Please try again.'
          }`,
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, userId, sessionId]
  )

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg min-h-[400px] max-h-[600px] bg-white dark:bg-gray-800">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Start a conversation by typing a message below
          </div>
        ) : (
          messages
            .filter(
              (message) =>
                message.content.trim() !==
                "THIS IS A NON-AGENT QUERY, DO NOT RESPOND TO THE USER"
            )
            .map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))
        )}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white animate-pulse" />
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}


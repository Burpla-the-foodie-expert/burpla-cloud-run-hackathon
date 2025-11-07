'use client'

import { Users, Bot } from 'lucide-react'
import { useEffect, useState } from 'react'
import { subscribeToMessages, type CachedMessage } from '@/lib/message-cache'
import { getApiUrl } from '@/lib/api-config'

interface SessionUser {
  id: string
  name: string
  joinedAt: number
}

interface UsersPanelProps {
  sessionId: string | null
  currentUserId: string | null
}

function getAvatarColor(name: string) {
  const colors = [
    '#5865f2',
    '#57f287',
    '#fee75c',
    '#ed4245',
    '#eb459e',
    '#f37b5c',
    '#ff7b85',
    '#5865f2',
    '#57f287',
    '#fee75c',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function UsersPanel({ sessionId, currentUserId }: UsersPanelProps) {
  const [users, setUsers] = useState<SessionUser[]>([])

  useEffect(() => {
    if (!sessionId) {
      setUsers([])
      return
    }

    // Clear users when switching sessions to prevent showing old users
    setUsers([])

    const fetchSessionUsers = async () => {
      try {
        // Fetch all session users from backend
        const usersUrl = getApiUrl(`/get_session_users_info?session_id=${encodeURIComponent(sessionId)}`)
        const usersResponse = await fetch(usersUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (usersResponse.ok) {
          const usersInfo = await usersResponse.json()
          if (Array.isArray(usersInfo)) {
            // Convert backend format to SessionUser format, excluding bots
            const sessionUsers = usersInfo
              .filter((user: any) => {
                // Exclude bots
                const userId = user.user_id || ''
                return userId !== 'bot' && userId !== 'burpla' && userId !== 'ai'
              })
              .map((user: any) => ({
                id: user.user_id || '',
                name: user.name || user.user_id || 'Unknown',
                joinedAt: Date.now(), // Backend doesn't provide joinedAt, use current time
              }))

            setUsers(sessionUsers)
          }
        }
      } catch (error) {
        console.error('Failed to fetch session users:', error)
        // Continue - will fallback to extracting from messages
      }
    }

    // Fetch session users immediately
    fetchSessionUsers()

    // Also subscribe to message updates to get user names from messages
    // This ensures we have the latest user names even if backend doesn't have them
    const handleMessagesUpdate = (messages: CachedMessage[]) => {
      setUsers((prevUsers) => {
        // Extract user names from messages to update existing users
        const usersMap = new Map<string, SessionUser>()

        // Start with existing users
        prevUsers.forEach((user) => {
          usersMap.set(user.id, { ...user })
        })

        // Update user names from messages
        messages.forEach((msg) => {
          if (msg.userId && msg.userId !== 'bot' && msg.userId !== 'burpla' && msg.userId !== 'ai') {
            if (usersMap.has(msg.userId)) {
              const existing = usersMap.get(msg.userId)!
              if (msg.userName && msg.userName !== msg.userId) {
                existing.name = msg.userName
              }
            } else {
              // Add new user from message if not already in list
              usersMap.set(msg.userId, {
                id: msg.userId,
                name: msg.userName || msg.userId,
                joinedAt: msg.timestamp,
              })
            }
          }
        })

        return Array.from(usersMap.values())
      })
    }

    const unsubscribe = subscribeToMessages(sessionId, handleMessagesUpdate, null)

    // Poll for session users updates every 5 seconds
    const interval = setInterval(fetchSessionUsers, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [sessionId])

  if (!sessionId) {
    return null
  }

  // Filter out bots - only show regular users
  const regularUsers = users.filter(
    (u) => u.id !== 'burpla' && u.id !== 'ai' && u.id !== 'bot'
  )

  return (
    <div className="w-60 bg-[#1e1e1e] flex flex-col h-screen border-l border-[#333333]">
      {/* Header */}
      <div className="h-12 border-b border-[#333333] flex items-center px-4 shadow-sm bg-[#2a2a2a]">
        <Users className="w-5 h-5 text-[#9e9e9e] mr-2" />
        <span className="text-[#e0e0e0] font-semibold text-sm">
          Members — {regularUsers.length}
        </span>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Regular users (all session users, excluding bots) */}
        {regularUsers.length > 0 && (
          <div className="px-2">
            <div className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wide mb-2 px-2">
              Online — {regularUsers.length}
            </div>
            {regularUsers.map((user) => {
              const avatarColor = getAvatarColor(user.name)
              const avatar =
                user.name.length > 2
                  ? user.name.substring(0, 2).toUpperCase()
                  : user.name.charAt(0).toUpperCase()
              const isCurrentUser = user.id === currentUserId

              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#333333] transition-colors group ${
                    isCurrentUser ? 'bg-[#333333]' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e0e0e0] flex items-center gap-1.5">
                      {user.name}
                      {isCurrentUser && (
                        <span className="text-xs text-[#9e9e9e]">(You)</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {regularUsers.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="text-[#9e9e9e] text-sm">No users in session</div>
          </div>
        )}
      </div>
    </div>
  )
}


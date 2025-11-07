'use client'

import { Users, Bot } from 'lucide-react'
import { useEffect, useState } from 'react'

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

    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/sessions?sessionId=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.users) {
            setUsers(data.users)
          }
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }

    fetchUsers()

    // Poll for user updates every 2 seconds
    const interval = setInterval(fetchUsers, 2000)

    return () => clearInterval(interval)
  }, [sessionId])

  if (!sessionId) {
    return null
  }

  // Separate bot and regular users
  const botUsers = users.filter((u) => u.id === 'burpla' || u.id === 'ai')
  const regularUsers = users.filter(
    (u) => u.id !== 'burpla' && u.id !== 'ai'
  )

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col h-screen">
      {/* Header */}
      <div className="h-12 border-b border-[#202225] flex items-center px-4 shadow-sm">
        <Users className="w-5 h-5 text-[#72767d] mr-2" />
        <span className="text-white font-semibold text-sm">
          Members — {users.length}
        </span>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Bot users */}
        {botUsers.length > 0 && (
          <div className="px-2 mb-4">
            <div className="text-xs font-semibold text-[#8e9297] uppercase tracking-wide mb-2 px-2">
              Bots
            </div>
            {botUsers.map((user) => {
              const avatarColor = getAvatarColor(user.name)
              const avatar =
                user.name === 'Burpla' || user.name === 'burpla'
                  ? 'B'
                  : user.name.length > 2
                    ? user.name.substring(0, 2).toUpperCase()
                    : user.name.charAt(0).toUpperCase()

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#393c43] transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white flex items-center gap-1.5">
                      {user.name}
                      <span className="text-xs text-[#72767d]">Bot</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Regular users */}
        {regularUsers.length > 0 && (
          <div className="px-2">
            <div className="text-xs font-semibold text-[#8e9297] uppercase tracking-wide mb-2 px-2">
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
                  className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#393c43] transition-colors group ${
                    isCurrentUser ? 'bg-[#393c43]' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white flex items-center gap-1.5">
                      {user.name}
                      {isCurrentUser && (
                        <span className="text-xs text-[#72767d]">(You)</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {users.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="text-[#72767d] text-sm">No users in session</div>
          </div>
        )}
      </div>
    </div>
  )
}


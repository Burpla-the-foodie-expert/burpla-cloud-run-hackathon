'use client'

import { Hash, Settings, MapPin, Plus, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { getApiUrl } from '@/lib/api-config'
import { format } from 'date-fns'
import { UserSettingsDialog } from './user-settings-dialog'

interface Session {
  session_id: string
  session_name: string
  owner_id: string
  member_id_list: string
  last_updated: string
  created_date: string
}

interface SidebarProps {
  userName?: string
  currentSessionId?: string | null
  onSessionChange?: (sessionId: string) => void
  onUserUpdate?: (data: { name: string; location: { lat: number; lng: number } | null }) => void
}

export function Sidebar({ userName, currentSessionId, onSessionChange, onUserUpdate }: SidebarProps) {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLocation, setHasLocation] = useState(false)
  const [displayName, setDisplayName] = useState('User')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const location = localStorage.getItem('userLocation')
    setHasLocation(!!location)

    // Use session user name if available, otherwise fall back to localStorage or prop
    if (session?.user?.name) {
      setDisplayName(session.user.name)
    } else {
      const storedName = localStorage.getItem('userName')
      if (storedName) {
        setDisplayName(storedName)
      } else if (userName) {
        setDisplayName(userName)
      }
    }
  }, [userName, session])

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Get userId from localStorage (using a default for now)
        const userId = localStorage.getItem('userId') || 'user_001'

        // Fetch sessions from backend
        const backendUrl = getApiUrl(`/convo_init?user_id=${encodeURIComponent(userId)}`)
        const response = await fetch(backendUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            // Sort by last_updated descending (most recent first)
            const sorted = data.sort((a, b) => {
              const dateA = new Date(a.last_updated || a.created_date || 0).getTime()
              const dateB = new Date(b.last_updated || b.created_date || 0).getTime()
              return dateB - dateA
            })
            setSessions(sorted)
          }
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()

    // Refresh sessions every 30 seconds
    const interval = setInterval(fetchSessions, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSessionClick = (sessionId: string) => {
    if (onSessionChange) {
      onSessionChange(sessionId)
    }
  }

  const handleCreateSession = () => {
    // Generate a new session ID
    const newSessionId = `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`
    if (onSessionChange) {
      onSessionChange(newSessionId)
    }
  }

  const handleLogout = async () => {
    const userId = localStorage.getItem('userId')

    // Clear user from server-side sessions
    if (userId) {
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', userId }),
        })
      } catch (error) {
        console.error('Failed to logout from sessions:', error)
        // Continue with logout even if API call fails
      }
    }

    // Clear all local storage data
    localStorage.removeItem('userInitialized')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userLocation')
    localStorage.removeItem('userId')
    localStorage.removeItem('currentSessionId')

    // Clear session from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('session')
    window.history.replaceState({}, '', url.toString())

    // Sign out from NextAuth if signed in
    if (session) {
      await signOut({ callbackUrl: window.location.origin })
    } else {
      // If not signed in with NextAuth, just reload to show welcome screen
      window.location.href = window.location.origin
    }
  }

  return (
    <div className="w-60 bg-[#1e1e1e] flex flex-col h-screen border-r border-[#333333]">
      {/* Server header */}
      <div className="h-12 border-b border-[#333333] flex items-center px-4 shadow-sm bg-[#2a2a2a]">
        <div className="text-[#e0e0e0] font-semibold text-base">AI Chat Server</div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="px-2 mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wide px-2">
            Sessions
          </div>
          <button
            onClick={handleCreateSession}
            className="p-1 text-[#9e9e9e] hover:text-[#9c27b0] hover:bg-[#333333] rounded transition-colors"
            title="Create new session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {isLoading ? (
          <div className="px-2 py-4 text-center">
            <div className="text-xs text-[#9e9e9e]">Loading sessions...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <div className="text-xs text-[#9e9e9e] mb-2">No sessions found</div>
            <button
              onClick={handleCreateSession}
              className="text-xs text-[#9c27b0] hover:underline"
            >
              Create your first session
            </button>
          </div>
        ) : (
          sessions.map((session) => {
            const isSelected = currentSessionId === session.session_id
            const sessionName = session.session_name || session.session_id
            const lastUpdated = session.last_updated
              ? format(new Date(session.last_updated), 'MMM d, h:mm a')
              : format(new Date(session.created_date || Date.now()), 'MMM d, h:mm a')

            return (
              <button
                key={session.session_id}
                onClick={() => handleSessionClick(session.session_id)}
                className={`w-full flex flex-col items-start gap-1 px-2 py-2 rounded text-sm mb-1 transition-colors ${
                  isSelected
                    ? 'bg-[#9c27b0] text-white'
                    : 'text-[#9e9e9e] hover:bg-[#333333] hover:text-[#e0e0e0]'
                }`}
                title={session.session_id}
              >
                <div className="flex items-center gap-2 w-full">
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium truncate flex-1 text-left">{sessionName}</span>
                </div>
                <div className={`text-xs px-6 ${isSelected ? 'text-white/70' : 'text-[#9e9e9e]'}`}>
                  {lastUpdated}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* User section */}
      <div className="h-14 bg-[#2a2a2a] border-t border-[#333333] flex items-center px-2">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#333333] rounded cursor-pointer flex-1">
          <div className="w-8 h-8 rounded-full bg-[#9c27b0] flex items-center justify-center text-white text-sm font-medium">
            {displayName.length > 2
              ? displayName.substring(0, 2).toUpperCase()
              : displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#e0e0e0] truncate">{displayName}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#9e9e9e]">
                {session?.user?.email ? 'Signed in' : 'Online'}
              </span>
              {hasLocation && (
                <span className="text-xs text-[#4caf50] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Located
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 text-[#9e9e9e] hover:text-[#9c27b0]"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1 text-[#9e9e9e] hover:text-[#ed4245]"
              title={session ? "Sign out" : "Log out"}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Settings Dialog */}
      <UserSettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={(data) => {
          // Update local state
          setDisplayName(data.name)
          setHasLocation(!!data.location)

          // Notify parent component
          if (onUserUpdate) {
            onUserUpdate(data)
          }

          // Refresh display
          const location = localStorage.getItem('userLocation')
          setHasLocation(!!location)
        }}
      />
    </div>
  )
}


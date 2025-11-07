'use client'

import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Sidebar } from '@/components/ai-elements/sidebar'
import { DiscordChat } from '@/components/ai-elements/discord-chat'
import { GroupChat } from '@/components/ai-elements/group-chat'
import { SessionManager } from '@/components/ai-elements/session-manager'
import { WelcomeScreen } from '@/components/ai-elements/welcome-screen'
import { UsersPanel } from '@/components/ai-elements/users-panel'

interface UserData {
  name: string
  location: { lat: number; lng: number } | null
  email?: string
}

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Check if user has already initialized
    if (typeof window !== 'undefined') {
      const initialized = localStorage.getItem('userInitialized')
      const userName = localStorage.getItem('userName')
      const userLocation = localStorage.getItem('userLocation')
      const storedUserId = localStorage.getItem('userId')

      if (initialized === 'true' && userName) {
        setUserData({
          name: userName,
          location: userLocation ? JSON.parse(userLocation) : null,
        })
        setIsInitialized(true)
      }

      // Generate or retrieve userId
      if (!storedUserId) {
        const newUserId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        localStorage.setItem('userId', newUserId)
        setUserId(newUserId)
      } else {
        setUserId(storedUserId)
      }

      setIsLoading(false)
    }
  }, [])

  const handleWelcomeComplete = (data: UserData) => {
    setUserData(data)
    setIsInitialized(true)
    // Store email if provided
    if (data.email) {
      localStorage.setItem('userEmail', data.email)
    }
  }

  const handleUserUpdate = (data: { name: string; location: { lat: number; lng: number } | null }) => {
    setUserData({
      name: data.name,
      location: data.location,
      email: userData?.email,
    })
  }

  const handleSessionChange = (id: string) => {
    setSessionId(id)
    // Join session if user is initialized
    if (userData && userId) {
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          sessionId: id,
          userId,
          userName: userData.name,
        }),
      }).catch(console.error)
    }
  }

  if (isLoading) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-[#121212]">
        <div className="text-[#9e9e9e]">Loading...</div>
      </main>
    )
  }

  if (!isInitialized) {
    return (
      <SessionProvider>
        <main className="flex h-screen w-screen overflow-hidden">
          <WelcomeScreen onComplete={handleWelcomeComplete} />
        </main>
      </SessionProvider>
    )
  }

  return (
    <SessionProvider>
      <main className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        userName={userData?.name}
        currentSessionId={sessionId}
        onSessionChange={handleSessionChange}
        onUserUpdate={handleUserUpdate}
      />
      <div className="flex-1 flex flex-col">
        <SessionManager
          sessionId={sessionId}
          userName={userData?.name || 'User'}
          onSessionChange={handleSessionChange}
        />
        {sessionId && userId ? (
          <GroupChat
            sessionId={sessionId}
            userLocation={userData?.location || null}
            userName={userData?.name || 'User'}
            userId={userId}
          />
        ) : (
          <DiscordChat
            userLocation={userData?.location || null}
            userName={userData?.name || 'User'}
          />
        )}
      </div>
      {sessionId && <UsersPanel sessionId={sessionId} currentUserId={userId} />}
      </main>
    </SessionProvider>
  )
}


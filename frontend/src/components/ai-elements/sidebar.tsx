'use client'

import { MessageSquare, Hash, Users, Settings, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SidebarProps {
  userName?: string
}

export function Sidebar({ userName }: SidebarProps) {
  const [selectedChannel, setSelectedChannel] = useState('general')
  const [hasLocation, setHasLocation] = useState(false)
  const [displayName, setDisplayName] = useState('User')

  useEffect(() => {
    const location = localStorage.getItem('userLocation')
    setHasLocation(!!location)

    const storedName = localStorage.getItem('userName')
    if (storedName) {
      setDisplayName(storedName)
    } else if (userName) {
      setDisplayName(userName)
    }
  }, [userName])

  const channels = [
    { id: 'general', name: 'general', icon: Hash },
    { id: 'ai-chat', name: 'ai-chat', icon: MessageSquare },
  ]

  return (
    <div className="w-60 bg-[#1e1e1e] flex flex-col h-screen border-r border-[#333333]">
      {/* Server header */}
      <div className="h-12 border-b border-[#333333] flex items-center px-4 shadow-sm bg-[#2a2a2a]">
        <div className="text-[#e0e0e0] font-semibold text-base">AI Chat Server</div>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="px-2 mb-2">
          <div className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wide mb-1 px-2">
            Channels
          </div>
        </div>
        {channels.map((channel) => {
          const Icon = channel.icon
          return (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm mb-0.5 transition-colors ${
                selectedChannel === channel.id
                  ? 'bg-[#9c27b0] text-white'
                  : 'text-[#9e9e9e] hover:bg-[#333333] hover:text-[#e0e0e0]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{channel.name}</span>
            </button>
          )
        })}
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
            <div className="text-sm font-medium text-[#e0e0e0]">{displayName}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#9e9e9e]">Online</span>
              {hasLocation && (
                <span className="text-xs text-[#4caf50] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Located
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-1 text-[#9e9e9e] hover:text-[#9c27b0]">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


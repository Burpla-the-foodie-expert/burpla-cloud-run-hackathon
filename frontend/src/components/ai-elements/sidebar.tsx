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
    <div className="w-60 bg-[#2f3136] flex flex-col h-screen">
      {/* Server header */}
      <div className="h-12 border-b border-[#202225] flex items-center px-4 shadow-sm">
        <div className="text-white font-semibold text-base">AI Chat Server</div>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="px-2 mb-2">
          <div className="text-xs font-semibold text-[#8e9297] uppercase tracking-wide mb-1 px-2">
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
                  ? 'bg-[#393c43] text-white'
                  : 'text-[#96989d] hover:bg-[#393c43] hover:text-[#dcddde]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{channel.name}</span>
            </button>
          )
        })}
      </div>

      {/* User section */}
      <div className="h-14 bg-[#292b2f] border-t border-[#202225] flex items-center px-2">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#393c43] rounded cursor-pointer flex-1">
          <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-medium">
            {displayName.length > 2
              ? displayName.substring(0, 2).toUpperCase()
              : displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">{displayName}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#b9bbbe]">Online</span>
              {hasLocation && (
                <span className="text-xs text-[#57f287] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Located
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-1 text-[#b9bbbe] hover:text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


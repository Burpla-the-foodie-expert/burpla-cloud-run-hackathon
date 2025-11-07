"use client";

import { useState, useEffect } from "react";
import { X, MapPin, User, Mail, Key, Save, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";

interface UserSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (data: { name: string; location: { lat: number; lng: number } | null }) => void;
}

export function UserSettingsDialog({ isOpen, onClose, onUpdate }: UserSettingsDialogProps) {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Load user data from localStorage and session
  useEffect(() => {
    if (isOpen) {
      const storedName = localStorage.getItem("userName") || "";
      const storedLocation = localStorage.getItem("userLocation");
      const storedUserId = localStorage.getItem("userId") || "";
      const storedEmail = localStorage.getItem("userEmail") || "";

      setName(storedName);
      setUserId(storedUserId);
      setUserEmail(session?.user?.email || storedEmail);

      if (storedLocation) {
        try {
          setLocation(JSON.parse(storedLocation));
        } catch (e) {
          console.error("Failed to parse location:", e);
        }
      } else {
        setLocation(null);
      }
    }
  }, [isOpen, session]);

  const requestLocation = () => {
    setIsRequestingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(loc);
        setIsRequestingLocation(false);
        setLocationError(null);
      },
      (err) => {
        let errorMessage = "Unable to get your location.";

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location permission denied. You can enable it later in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }

        setLocationError(errorMessage);
        setIsRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Please enter your name");
      return;
    }

    setIsSaving(true);
    setNameError(null);

    try {
      const userId = localStorage.getItem("userId");
      const currentSessionId = localStorage.getItem("currentSessionId");

      // Update localStorage
      localStorage.setItem("userName", name.trim());
      if (location) {
        localStorage.setItem("userLocation", JSON.stringify(location));
      } else {
        localStorage.removeItem("userLocation");
      }

      // Update user name in active sessions if user is in a session
      if (userId && currentSessionId) {
        try {
          await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join", // Re-join with updated name
              sessionId: currentSessionId,
              userId,
              userName: name.trim(),
            }),
          });
        } catch (error) {
          console.error("Failed to update session with new name:", error);
          // Continue even if session update fails
        }
      }

      // Notify parent component of changes
      if (onUpdate) {
        onUpdate({
          name: name.trim(),
          location,
        });
      }

      // Close dialog after a short delay to show success
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error("Failed to save user settings:", error);
      setIsSaving(false);
    }
  };

  const handleRemoveLocation = () => {
    setLocation(null);
    localStorage.removeItem("userLocation");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#2f3136] rounded-lg border border-[#40444b] shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#40444b]">
          <h2 className="text-xl font-bold text-white">User Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#9e9e9e] hover:text-white hover:bg-[#40444b] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Information (Read-only) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#b9bbbe] uppercase tracking-wide">
              Account Information
            </h3>

            {/* User ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#b9bbbe] mb-2">
                <Key className="w-4 h-4" />
                User ID
              </label>
              <div className="p-3 bg-[#40444b] rounded-lg text-[#9e9e9e] text-sm font-mono break-all">
                {userId || "Not set"}
              </div>
            </div>

            {/* Email */}
            {userEmail && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#b9bbbe] mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <div className="p-3 bg-[#40444b] rounded-lg text-[#9e9e9e] text-sm">
                  {userEmail}
                </div>
                {session?.user?.email && (
                  <p className="mt-1 text-xs text-[#72767d]">
                    Connected via Google account
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Editable Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#b9bbbe] uppercase tracking-wide">
              Profile Settings
            </h3>

            {/* Name Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#b9bbbe] mb-2">
                <User className="w-4 h-4" />
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-[#40444b] border border-[#202225] rounded-lg text-white placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#5865f2] focus:border-transparent transition-all"
                maxLength={50}
              />
              {nameError && (
                <p className="mt-1 text-sm text-[#ed4245]">{nameError}</p>
              )}
            </div>

            {/* Location Section */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#b9bbbe] mb-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>

              {location ? (
                <div className="p-4 bg-[#40444b] border border-[#57f287]/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#57f287]/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#57f287]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Location Shared</p>
                      <p className="text-xs text-[#72767d]">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveLocation}
                      className="text-xs text-[#ed4245] hover:text-[#ff6b7a] transition-colors px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={requestLocation}
                    disabled={isRequestingLocation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#40444b] hover:bg-[#36393f] border border-[#202225] rounded-lg text-[#dcddde] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MapPin className="w-5 h-5" />
                    {isRequestingLocation ? "Getting location..." : "Share Location"}
                  </button>

                  {locationError && (
                    <div className="p-3 bg-[#ed4245]/20 border border-[#ed4245]/50 rounded text-[#ed4245] text-sm">
                      {locationError}
                    </div>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-[#72767d]">
                Sharing your location helps us provide better recommendations for nearby places
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#40444b]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#dcddde] hover:bg-[#40444b] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


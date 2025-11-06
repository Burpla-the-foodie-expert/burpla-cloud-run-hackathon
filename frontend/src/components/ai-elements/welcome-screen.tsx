"use client";

import { useState, useEffect } from "react";
import { MapPin, User, ArrowRight, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onComplete: (data: { name: string; location: { lat: number; lng: number } | null }) => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Check if there's existing data
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedLocation = localStorage.getItem("userLocation");

    if (storedName) {
      setName(storedName);
    }
    if (storedLocation) {
      setLocation(JSON.parse(storedLocation));
    }
  }, []);

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
        localStorage.setItem("userLocation", JSON.stringify(loc));
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

  const handleContinue = () => {
    if (!name.trim()) {
      setNameError("Please enter your name");
      return;
    }

    // Store name
    localStorage.setItem("userName", name.trim());
    localStorage.setItem("userInitialized", "true");

    // Complete initialization
    onComplete({
      name: name.trim(),
      location,
    });
  };

  const handleSkipLocation = () => {
    // Allow skipping location
    if (name.trim()) {
      localStorage.setItem("userName", name.trim());
      localStorage.setItem("userInitialized", "true");
      onComplete({
        name: name.trim(),
        location: null,
      });
    } else {
      setNameError("Please enter your name");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202225]">
      <div className="w-full max-w-md mx-4">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5865f2] mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to AI Chat
          </h1>
          <p className="text-[#72767d] text-sm">
            Let's set up your profile to get started
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#2f3136] rounded-lg border border-[#40444b] p-6 space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-[#b9bbbe] mb-2">
              Your Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-[#72767d]" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="Enter your name"
                className="w-full pl-10 pr-4 py-3 bg-[#40444b] border border-[#202225] rounded-lg text-white placeholder-[#72767d] focus:outline-none focus:ring-2 focus:ring-[#5865f2] focus:border-transparent transition-all"
                maxLength={50}
              />
            </div>
            {nameError && (
              <p className="mt-1 text-sm text-[#ed4245]">{nameError}</p>
            )}
          </div>

          {/* Location Section */}
          <div>
            <label className="block text-sm font-semibold text-[#b9bbbe] mb-2">
              Your Location
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
                    onClick={() => {
                      setLocation(null);
                      localStorage.removeItem("userLocation");
                    }}
                    className="text-xs text-[#ed4245] hover:text-[#ff6b7a] transition-colors"
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!location && (
              <button
                onClick={handleSkipLocation}
                className="flex-1 px-4 py-3 bg-[#40444b] hover:bg-[#36393f] text-[#dcddde] font-medium rounded-lg transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleContinue}
              disabled={!name.trim()}
              className="flex-1 px-4 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#72767d]">
          Your information is stored locally and never shared without your permission
        </p>
      </div>
    </div>
  );
}


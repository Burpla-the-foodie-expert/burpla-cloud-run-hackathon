"use client";

import { useState, useEffect } from "react";
import { MapPin, X } from "lucide-react";

interface LocationPermissionProps {
  onLocationGranted: (location: { lat: number; lng: number }) => void;
  onLocationDenied: () => void;
}

export function LocationPermission({
  onLocationGranted,
  onLocationDenied,
}: LocationPermissionProps) {
  const [showModal, setShowModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we've already asked for location permission
    const hasAskedBefore = localStorage.getItem("locationPermissionAsked");
    const hasLocation = localStorage.getItem("userLocation");

    if (!hasAskedBefore && !hasLocation) {
      setShowModal(true);
    }
  }, []);

  const requestLocation = () => {
    setIsRequesting(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsRequesting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Store location and permission status
        localStorage.setItem("userLocation", JSON.stringify(location));
        localStorage.setItem("locationPermissionAsked", "true");

        onLocationGranted(location);
        setShowModal(false);
        setIsRequesting(false);
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

        setError(errorMessage);
        setIsRequesting(false);

        // Still mark as asked even if denied
        localStorage.setItem("locationPermissionAsked", "true");
        onLocationDenied();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleDismiss = () => {
    localStorage.setItem("locationPermissionAsked", "true");
    setShowModal(false);
    onLocationDenied();
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#2f3136] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[#40444b]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#40444b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Share Your Location
            </h2>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#72767d] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[#dcddde] mb-4">
            We'd like to use your location to provide better recommendations for
            places near you, calculate travel distances, and suggest convenient
            meeting spots.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[#ed4245]/20 border border-[#ed4245]/50 rounded text-[#ed4245] text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={requestLocation}
              disabled={isRequesting}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-2.5 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequesting ? "Getting location..." : "Share Location"}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isRequesting}
              className="w-full bg-[#40444b] hover:bg-[#36393f] text-[#dcddde] font-medium py-2.5 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Not Now
            </button>
          </div>

          <p className="text-xs text-[#72767d] mt-4">
            Your location data is only used locally and never stored on our
            servers without your explicit permission.
          </p>
        </div>
      </div>
    </div>
  );
}


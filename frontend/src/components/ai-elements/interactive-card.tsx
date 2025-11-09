"use client";

import {
  MapPin,
  Clock,
  Star,
  Users,
  ExternalLink,
  Calendar,
  Info,
  Utensils,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect, useRef, useMemo, memo } from "react";
import { getApiUrl } from "@/lib/api-config";

// Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

// Restaurant Recommendation Card Types
interface RestaurantLocation {
  lat: number;
  lng: number;
}

interface Restaurant {
  id?: string;
  name?: string;
  displayName?: string | { text?: string };
  address?: string;
  formattedAddress?: string;
  location?: string; // Address string
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  distance?: number; // Distance in meters
  photoUri?: string;
  mapUri?: string;
  googleMapsUri?: string;
  hyperlink?: string;
  placeId?: string;
  types?: string[];
  // Location coordinates (from Google Places API)
  location_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

interface RestaurantRecommendationConfig {
  restaurants: Restaurant[];
  userLocation?: RestaurantLocation;
  title?: string;
}

// Voting Card Types
interface VoteOption {
  id?: string;
  name?: string;
  restaurant_name?: string;
  description?: string;
  image?: string;
  photoUri?: string;
  review?: string;
  votes?: number;
  map?: string;
  hyperlink?: string;
  googleMapsUri?: string;
  restaurant_id?: string;
  number_of_vote?: number; // Alternative field name
  location?: string;
  rating?: number;
  userRatingCount?: number;
  vote_user_id_list?: string[]; // List of user IDs who voted for this option
}

interface VotingCardConfig {
  question: string;
  options: VoteOption[];
  totalVotes: number;
  allowVoting?: boolean;
  onVote?: (optionId: string) => void;
}

// Reminder Card Types
interface ReminderCardConfig {
  title: string;
  description: string;
  location?: {
    name: string;
    address: string;
    coordinates?: RestaurantLocation;
  };
  time: Date | string;
  priority?: "low" | "medium" | "high";
}

// Main Card Types Union
export type InteractiveCardConfig =
  | {
      type: "restaurant_recommendation";
      config: RestaurantRecommendationConfig;
    }
  | {
      type: "voting";
      config: VotingCardConfig;
    }
  | {
      type: "reminder";
      config: ReminderCardConfig;
    };

interface InteractiveCardProps {
  cardConfig: InteractiveCardConfig;
  className?: string;
  sessionId?: string | null;
  userId?: string | null;
  messageId?: string | null;
  onVoteUpdate?: () => void; // Callback to refresh messages after voting
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Price level to symbol
function getPriceSymbol(level?: number): string {
  if (!level) return "";
  return "$".repeat(Math.min(level, 4));
}

// Google Maps component for displaying restaurant locations
function RestaurantMap({
  restaurants,
  userLocation,
}: {
  restaurants: Restaurant[];
  userLocation?: RestaurantLocation;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const previousRestaurantsKeyRef = useRef<string>("");
  const previousUserLocationKeyRef = useRef<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create stable key for restaurants to detect actual changes
  const restaurantsKey = useMemo(() => {
    return JSON.stringify(
      restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        lat: r.location_coordinates?.latitude,
        lng: r.location_coordinates?.longitude,
        address: r.formattedAddress || r.address || r.location,
      }))
    );
  }, [restaurants]);

  // Create stable key for userLocation
  const userLocationKey = useMemo(() => {
    return userLocation ? `${userLocation.lat},${userLocation.lng}` : null;
  }, [userLocation]);

  // Get Google Maps API key from environment
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  // Load Google Maps script
  useEffect(() => {
    console.log("[RestaurantMap] Checking API key:", {
      hasKey: !!apiKey,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "none",
      envVars: {
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
          !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        NEXT_PUBLIC_GOOGLE_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      },
    });

    if (!apiKey) {
      setMapError(
        "Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY"
      );
      setIsLoading(false);
      return;
    }

    if (mapLoaded) return;

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      setIsLoading(false);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      // Script is loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          setMapLoaded(true);
          setIsLoading(false);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Create script element
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
        setIsLoading(false);
      } else {
        setMapError("Google Maps failed to load");
        setIsLoading(false);
      }
    };
    script.onerror = () => {
      setMapError(
        "Failed to load Google Maps script. Please check your API key."
      );
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [apiKey, mapLoaded]);

  // Initialize map and markers
  useEffect(() => {
    if (
      !mapLoaded ||
      !mapRef.current ||
      !window.google ||
      !window.google.maps
    ) {
      return;
    }

    // Check if data has actually changed
    const dataChanged =
      restaurantsKey !== previousRestaurantsKeyRef.current ||
      userLocationKey !== previousUserLocationKeyRef.current;

    // If map is already initialized and data hasn't changed, don't re-initialize
    if (mapInstanceRef.current && !dataChanged) {
      return;
    }

    // If data changed and map exists, clean up old markers
    if (mapInstanceRef.current && dataChanged) {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      markersRef.current = [];
      userMarkerRef.current = null;
    }

    // Geocode restaurants that don't have coordinates
    const geocodeRestaurants = async () => {
      const geocoder = new window.google.maps.Geocoder();
      const restaurantsWithCoords: Array<
        Restaurant & { lat: number; lng: number }
      > = [];

      for (const restaurant of restaurants) {
        // If restaurant already has coordinates, use them
        if (
          restaurant.location_coordinates?.latitude &&
          restaurant.location_coordinates?.longitude
        ) {
          restaurantsWithCoords.push({
            ...restaurant,
            lat: restaurant.location_coordinates.latitude,
            lng: restaurant.location_coordinates.longitude,
          });
          continue;
        }

        // Otherwise, geocode the address
        const address =
          restaurant.formattedAddress ||
          restaurant.address ||
          restaurant.location;
        if (!address) {
          console.warn(
            `[RestaurantMap] No address for restaurant: ${restaurant.name}`
          );
          continue;
        }

        try {
          const results = await new Promise<any>((resolve, reject) => {
            geocoder.geocode({ address }, (results: any, status: any) => {
              if (status === "OK" && results && results[0]) {
                resolve(results[0]);
              } else {
                reject(new Error(`Geocoding failed: ${status}`));
              }
            });
          });

          const location = results.geometry.location;
          restaurantsWithCoords.push({
            ...restaurant,
            lat: location.lat(),
            lng: location.lng(),
          });
        } catch (error) {
          console.warn(
            `[RestaurantMap] Failed to geocode ${restaurant.name}:`,
            error
          );
        }
      }

      return restaurantsWithCoords;
    };

    // Initialize map and geocode restaurants
    const initializeMap = async () => {
      try {
        // Get restaurants with coordinates (either existing or geocoded)
        const restaurantsWithCoords = await geocodeRestaurants();

        if (restaurantsWithCoords.length === 0) {
          console.log("[RestaurantMap] No restaurants with coordinates:", {
            total: restaurants.length,
            restaurants: restaurants.map((r) => ({
              name: r.name,
              hasCoords: !!(
                r.location_coordinates?.latitude &&
                r.location_coordinates?.longitude
              ),
              hasAddress: !!(r.formattedAddress || r.address || r.location),
              coords: r.location_coordinates,
            })),
          });
          setMapError("No restaurants with valid addresses found");
          setIsLoading(false);
          return;
        }

        console.log(
          "[RestaurantMap] Initializing map with",
          restaurantsWithCoords.length,
          "restaurants"
        );

        // Initialize map
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: {
            lat: restaurantsWithCoords[0].lat,
            lng: restaurantsWithCoords[0].lng,
          },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Store map instance to prevent re-initialization
        mapInstanceRef.current = map;

        // Create bounds to fit all markers
        const bounds = new window.google.maps.LatLngBounds();
        const infoWindow = new window.google.maps.InfoWindow();

        // Add markers for each restaurant
        restaurantsWithCoords.forEach((restaurant) => {
          const position = { lat: restaurant.lat, lng: restaurant.lng };

          const restaurantName =
            restaurant.name ||
            (typeof restaurant.displayName === "string"
              ? restaurant.displayName
              : restaurant.displayName?.text) ||
            "Restaurant";

          const restaurantAddress =
            restaurant.address ||
            restaurant.formattedAddress ||
            restaurant.location ||
            "Address not available";

          const mapUri =
            restaurant.mapUri ||
            restaurant.googleMapsUri ||
            restaurant.hyperlink;

          // Create marker
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: restaurantName,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            },
          });

          bounds.extend(position);
          markersRef.current.push(marker);

          // Add click listener to show info window
          marker.addListener("click", () => {
            const content = `
          <div style="font-family: Arial, sans-serif; padding: 8px; min-width: 200px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #333;">
              ${restaurantName}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              ${restaurantAddress}
            </div>
            ${
              restaurant.rating !== undefined
                ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                    ⭐ ${restaurant.rating.toFixed(1)} ${
                    restaurant.userRatingCount
                      ? `(${restaurant.userRatingCount.toLocaleString()})`
                      : ""
                  }
                  </div>`
                : ""
            }
            ${
              mapUri
                ? `<a href="${mapUri}" target="_blank" style="font-size: 12px; color: #1976d2; text-decoration: none;">
                    Open in Google Maps →
                  </a>`
                : ""
            }
          </div>
        `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });
        });

        // Add user location marker if available
        if (userLocation) {
          userMarkerRef.current = new window.google.maps.Marker({
            position: { lat: userLocation.lat, lng: userLocation.lng },
            map,
            title: "Your Location",
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });
          bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
        }

        // Fit map to show all markers
        if (restaurantsWithCoords.length > 1 || userLocation) {
          map.fitBounds(bounds);
          // Prevent zooming in too far
          window.google.maps.event.addListenerOnce(
            map,
            "bounds_changed",
            () => {
              if (map.getZoom()! > 17) {
                map.setZoom(17);
              }
            }
          );
        } else if (restaurantsWithCoords.length === 1) {
          // Center on single restaurant
          map.setCenter(bounds.getCenter());
          map.setZoom(15);
        }

        // Update previous keys
        previousRestaurantsKeyRef.current = restaurantsKey;
        previousUserLocationKeyRef.current = userLocationKey;
      } catch (error: any) {
        console.error("Error initializing Google Map:", error);
        setMapError(error.message || "Failed to initialize map");
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup: clear markers when component unmounts
    return () => {
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      markersRef.current = [];
      userMarkerRef.current = null;
    };
    // We intentionally use restaurantsKey and userLocationKey instead of restaurants and userLocation
    // to prevent re-renders when only the object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, restaurantsKey, userLocationKey]);

  // Show error state
  if (mapError) {
    return (
      <div className="h-80 bg-[#1e1f22] flex items-center justify-center text-[#72767d] text-sm p-4 text-center border border-[#40444b] rounded-lg">
        <div>
          <div className="mb-2">⚠️ {mapError}</div>
          {apiKey && (
            <div className="text-xs text-[#5a5d63] mt-2">
              API Key: {apiKey.substring(0, 10)}...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !mapLoaded) {
    return (
      <div className="h-80 bg-[#1e1f22] flex items-center justify-center text-[#72767d] text-sm border border-[#40444b] rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          Loading map...
        </div>
      </div>
    );
  }

  // Don't render if no API key
  if (!apiKey) {
    return (
      <div className="h-80 bg-[#1e1f22] flex items-center justify-center text-[#72767d] text-sm border border-[#40444b] rounded-lg">
        <div className="text-center">
          <div className="mb-2">Google Maps API key not configured</div>
          <div className="text-xs text-[#5a5d63]">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-[#1e1f22] rounded-lg overflow-hidden border border-[#40444b]">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}

// Memoize RestaurantMap to prevent re-renders when parent re-renders
const MemoizedRestaurantMap = memo(RestaurantMap);

// Image component with error handling
function RestaurantImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleLoad = () => {
    setImageLoading(false);
  };

  if (imageError) {
    return (
      <div
        className={`${
          className || ""
        } bg-[#1e1f22] flex items-center justify-center border border-[#40444b]`}
      >
        <ImageIcon className="w-8 h-8 text-[#72767d]" />
      </div>
    );
  }

  return (
    <div className="relative">
      {imageLoading && (
        <div
          className={`${
            className || ""
          } bg-[#1e1f22] flex items-center justify-center border border-[#40444b] absolute inset-0`}
        >
          <div className="w-4 h-4 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className || ""} ${
          imageLoading ? "opacity-0" : "opacity-100"
        } transition-opacity`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// Restaurant Recommendation Card Component
function RestaurantRecommendationCard({
  config,
}: {
  config: RestaurantRecommendationConfig;
}) {
  const { restaurants, userLocation, title } = config;

  // Calculate distances if user location is provided
  const restaurantsWithDistance = restaurants.map((restaurant) => {
    let distance = restaurant.distance;

    // Get restaurant coordinates from location_coordinates or try to calculate
    let restLat: number | undefined;
    let restLng: number | undefined;

    if (
      restaurant.location_coordinates?.latitude &&
      restaurant.location_coordinates?.longitude
    ) {
      restLat = restaurant.location_coordinates.latitude;
      restLng = restaurant.location_coordinates.longitude;
    } else if (userLocation && !distance) {
      // Try to parse coordinates from ID if it contains them (fallback)
      if (restaurant.id && restaurant.id.includes(",")) {
        const [lat, lng] = restaurant.id.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          restLat = lat;
          restLng = lng;
        }
      }
    }

    // Calculate distance if we have both locations
    if (userLocation && restLat && restLng && !distance) {
      distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        restLat,
        restLng
      );
    }

    return { ...restaurant, distance };
  });

  // Sort by distance if available
  const sortedRestaurants = [...restaurantsWithDistance].sort((a, b) => {
    if (a.distance && b.distance) return a.distance - b.distance;
    if (a.distance) return -1;
    if (b.distance) return 1;
    return 0;
  });

  // Check if restaurants have addresses (for geocoding) or coordinates
  const restaurantsWithLocation = sortedRestaurants.filter((r) =>
    r.location_coordinates?.latitude && r.location_coordinates?.longitude
      ? true
      : !!(r.formattedAddress || r.address || r.location)
  );

  return (
    <div className="bg-[#2f3136] border border-[#40444b] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-[#40444b]">
        <div className="flex items-center gap-2 mb-1">
          <Utensils className="w-5 h-5 text-[#5865f2]" />
          <h3 className="text-base font-semibold text-white">
            {title || "Restaurant Recommendations"}
          </h3>
        </div>
        <p className="text-sm text-[#72767d] mt-1">
          {sortedRestaurants.length} restaurant
          {sortedRestaurants.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Google Map with pinned restaurants */}
      {restaurantsWithLocation.length > 0 && (
        <div className="p-4 border-b border-[#40444b]">
          <MemoizedRestaurantMap
            restaurants={sortedRestaurants}
            userLocation={userLocation}
          />
        </div>
      )}

      <div className="divide-y divide-[#40444b]">
        {sortedRestaurants.map((restaurant, index) => {
          // Normalize restaurant name (handle different field names)
          const restaurantName =
            restaurant.name ||
            (typeof restaurant.displayName === "string"
              ? restaurant.displayName
              : restaurant.displayName?.text) ||
            `Restaurant ${index + 1}`;

          // Normalize address
          const restaurantAddress =
            restaurant.address ||
            restaurant.formattedAddress ||
            restaurant.location ||
            "Address not available";

          // Normalize map URI
          const mapUri =
            restaurant.mapUri ||
            restaurant.googleMapsUri ||
            restaurant.hyperlink;

          return (
            <div
              key={restaurant.id || restaurant.placeId || index}
              className="p-4 hover:bg-[#36393f] transition-colors"
            >
              <div className="flex gap-4">
                {restaurant.photoUri && (
                  <div className="flex-shrink-0">
                    <RestaurantImage
                      src={restaurant.photoUri}
                      alt={restaurantName}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-base font-medium text-white flex-1">
                      {restaurantName}
                    </h4>
                    {mapUri && (
                      <a
                        href={mapUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5865f2] hover:text-[#4752c4] transition-colors flex-shrink-0"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-[#72767d] mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{restaurantAddress}</span>
                    </div>
                    {restaurant.distance && (
                      <span className="text-[#57f287] whitespace-nowrap">
                        {formatDistance(restaurant.distance)} away
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {restaurant.rating !== undefined && (
                      <div className="flex items-center gap-1 text-[#fee75c]">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{restaurant.rating.toFixed(1)}</span>
                        {restaurant.userRatingCount && (
                          <span className="text-[#72767d]">
                            ({restaurant.userRatingCount.toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                    {restaurant.priceLevel && (
                      <span className="text-[#57f287]">
                        {getPriceSymbol(restaurant.priceLevel)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Voting Card Component
function VotingCard({
  config,
  sessionId,
  userId,
  messageId,
  onVoteUpdate,
}: {
  config: VotingCardConfig;
  sessionId?: string | null;
  userId?: string | null;
  messageId?: string | null;
  onVoteUpdate?: () => void;
}) {
  const { question, options, totalVotes, allowVoting = false, onVote } = config;

  // Initialize votedOptionId from options if user has already voted
  const getInitialVotedOptionId = (): string | null => {
    if (!userId || !options.length) return null;
    for (const opt of options) {
      const voteList = (opt as any).vote_user_id_list;
      if (Array.isArray(voteList) && voteList.includes(userId)) {
        return opt.id || opt.restaurant_id || null;
      }
    }
    return null;
  };

  const [votedOptionId, setVotedOptionId] = useState<string | null>(
    getInitialVotedOptionId()
  );
  const [isVoting, setIsVoting] = useState(false);
  const [localOptions, setLocalOptions] = useState(options);

  // Update local options when config changes
  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  // Check if user has already voted (from vote_user_id_list if available)
  // This updates when options or userId changes
  useEffect(() => {
    if (userId && localOptions.length > 0) {
      let foundOptionId: string | null = null;

      // Check each option for vote_user_id_list
      for (const opt of localOptions) {
        const voteList = (opt as any).vote_user_id_list;
        if (Array.isArray(voteList) && voteList.includes(userId)) {
          foundOptionId = opt.id || opt.restaurant_id || null;
          break;
        }
      }

      // Update votedOptionId using functional update to avoid stale closure
      setVotedOptionId((current) => {
        // Only update if the value actually changed
        if (foundOptionId !== current) {
          return foundOptionId;
        }
        return current;
      });
    } else if (!userId) {
      // Reset if userId is not available
      setVotedOptionId(null);
    }
  }, [userId, localOptions]);

  // Handle vote button click
  const handleVote = async (optionId: string) => {
    if (!sessionId || !userId || !messageId || isVoting) {
      return;
    }

    // Check if already voted for this option (toggle vote)
    // If clicking the same option, unvote (is_vote_up = false)
    // If clicking a different option, vote for it (is_vote_up = true)
    const isVotingUp = votedOptionId !== optionId;
    const previousVotedOptionId = votedOptionId;

    setIsVoting(true);

    try {
      // Call backend vote endpoint
      const voteUrl = getApiUrl(
        `/chat/vote?session_id=${encodeURIComponent(
          sessionId
        )}&user_id=${encodeURIComponent(
          userId
        )}&message_id=${encodeURIComponent(
          messageId
        )}&vote_option_id=${encodeURIComponent(
          optionId
        )}&is_vote_up=${isVotingUp}`
      );

      const response = await fetch(voteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Update local state optimistically
        setLocalOptions((prev) =>
          prev.map((opt) => {
            const optId = opt.id || opt.restaurant_id;

            // Update the option being voted on
            if (optId === optionId) {
              const currentVotes = opt.votes || opt.number_of_vote || 0;
              const newVotes = isVotingUp
                ? currentVotes + 1
                : Math.max(0, currentVotes - 1);

              // Update vote_user_id_list
              const voteList = (opt as any).vote_user_id_list || [];
              let newVoteList = [...voteList];

              if (isVotingUp) {
                // Add user to vote list if not already there
                if (!newVoteList.includes(userId!)) {
                  newVoteList.push(userId!);
                }
              } else {
                // Remove user from vote list
                newVoteList = newVoteList.filter((id: string) => id !== userId);
              }

              return {
                ...opt,
                votes: newVotes,
                number_of_vote: newVotes,
                vote_user_id_list: newVoteList,
              };
            }

            // If switching votes, remove vote from previous option
            if (
              previousVotedOptionId &&
              optId === previousVotedOptionId &&
              isVotingUp
            ) {
              const currentVotes = opt.votes || opt.number_of_vote || 0;
              const voteList = (opt as any).vote_user_id_list || [];
              const newVoteList = voteList.filter(
                (id: string) => id !== userId
              );

              return {
                ...opt,
                votes: Math.max(0, currentVotes - 1),
                number_of_vote: Math.max(0, currentVotes - 1),
                vote_user_id_list: newVoteList,
              };
            }

            return opt;
          })
        );

        setVotedOptionId(isVotingUp ? optionId : null);

        // Call custom onVote handler if provided
        if (onVote) {
          onVote(optionId);
        }

        // Refresh messages to get updated vote counts from backend
        if (onVoteUpdate) {
          setTimeout(() => {
            onVoteUpdate();
          }, 500);
        }
      } else {
        console.error("Failed to vote:", await response.text());
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  // Normalize vote counts (handle both votes and number_of_vote fields)
  const normalizedOptions = localOptions.map((opt) => ({
    ...opt,
    voteCount: opt.votes || opt.number_of_vote || 0,
  }));

  // Recalculate total votes from local options
  const currentTotalVotes = normalizedOptions.reduce(
    (sum, opt) => sum + opt.voteCount,
    0
  );

  // Calculate percentages
  const optionsWithPercentages = normalizedOptions.map((opt) => ({
    ...opt,
    percentage:
      currentTotalVotes > 0
        ? Math.round((opt.voteCount / currentTotalVotes) * 100)
        : 0,
  }));

  // Sort by votes (highest first)
  const sortedOptions = [...optionsWithPercentages].sort(
    (a, b) => b.voteCount - a.voteCount
  );

  return (
    <div className="bg-[#2f3136] border border-[#40444b] rounded-lg overflow-hidden">
      <div className="p-4 border-b border-[#40444b]">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-[#5865f2]" />
          <h3 className="text-base font-semibold text-white">{question}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#72767d]">
          <span>
            {currentTotalVotes} vote{currentTotalVotes !== 1 ? "s" : ""}
          </span>
          <span>•</span>
          <span>
            {options.length} option{options.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#40444b]">
        {sortedOptions.map((option, index) => {
          const displayName =
            option.name || option.restaurant_name || `Option ${index + 1}`;
          const voteCount = option.voteCount;
          const percentage = option.percentage;

          // Normalize image/photo URI
          const imageUri = option.image || option.photoUri;

          // Normalize map/link URI
          const mapUri = option.map || option.hyperlink || option.googleMapsUri;

          return (
            <div
              key={option.id || index}
              className="p-4 hover:bg-[#36393f] transition-colors"
            >
              <div className="flex gap-4 mb-3">
                {imageUri && (
                  <div className="flex-shrink-0">
                    <RestaurantImage
                      src={imageUri}
                      alt={displayName}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-base font-medium text-white">
                      {displayName}
                    </h4>
                    {mapUri && (
                      <a
                        href={mapUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5865f2] hover:text-[#4752c4] transition-colors flex-shrink-0"
                        title="View on map"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {option.description && (
                    <p className="text-sm text-[#dcddde] mb-2">
                      {option.description}
                    </p>
                  )}

                  {option.review && (
                    <p className="text-sm text-[#72767d] italic">
                      &quot;{option.review}&quot;
                    </p>
                  )}

                  {/* Show rating if available */}
                  {option.rating !== undefined && (
                    <div className="flex items-center gap-1 text-sm text-[#fee75c] mt-2">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{option.rating.toFixed(1)}</span>
                      {option.userRatingCount && (
                        <span className="text-[#72767d]">
                          ({option.userRatingCount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}

                  {option.location && (
                    <div className="flex items-center gap-1 text-sm text-[#72767d] mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{option.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vote count and progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {voteCount} vote{voteCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[#72767d]">({percentage}%)</span>
                  </div>
                  {allowVoting && sessionId && userId && messageId && (
                    <button
                      onClick={() =>
                        handleVote(option.id || option.restaurant_id || "")
                      }
                      disabled={
                        isVoting ||
                        (votedOptionId !== null &&
                          votedOptionId !== (option.id || option.restaurant_id))
                      }
                      className={`px-3 py-1 text-white text-sm rounded transition-colors flex items-center gap-1.5 ${
                        votedOptionId === (option.id || option.restaurant_id)
                          ? "bg-[#57f287] hover:bg-[#4ae077]"
                          : "bg-[#5865f2] hover:bg-[#4752c4]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isVoting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Voting...
                        </>
                      ) : votedOptionId ===
                        (option.id || option.restaurant_id) ? (
                        <>
                          <Check className="w-3 h-3" />
                          Voted
                        </>
                      ) : (
                        "Vote"
                      )}
                    </button>
                  )}
                </div>
                <div className="w-full bg-[#1e1f22] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-[#5865f2] transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Reminder Card Component
function ReminderCard({ config }: { config: ReminderCardConfig }) {
  const { title, description, location, time, priority = "medium" } = config;

  const reminderTime = typeof time === "string" ? new Date(time) : time;
  const timeUntil = formatDistanceToNow(reminderTime, { addSuffix: true });
  const formattedTime = format(reminderTime, "EEEE, MMMM d, yyyy 'at' h:mm a");

  const priorityColors = {
    low: "bg-[#57f287]",
    medium: "bg-[#fee75c]",
    high: "bg-[#ed4245]",
  };

  return (
    <div className="bg-[#2f3136] border border-[#40444b] rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <div
              className={`w-2 h-2 rounded-full ${priorityColors[priority]}`}
              title={`${priority} priority`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-[#5865f2]" />
              <h3 className="text-base font-semibold text-white">{title}</h3>
            </div>
            <p className="text-sm text-[#dcddde] mb-4">{description}</p>

            {/* Time Information */}
            <div className="flex items-center gap-2 text-sm text-[#72767d] mb-3">
              <Clock className="w-4 h-4" />
              <span>{formattedTime}</span>
              <span className="text-[#5865f2]">•</span>
              <span>{timeUntil}</span>
            </div>

            {/* Location Information */}
            {location && (
              <div className="flex items-start gap-2 text-sm text-[#72767d]">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium mb-1">
                    {location.name}
                  </div>
                  <div>{location.address}</div>
                  {location.coordinates && location.coordinates.lat && (
                    <a
                      href={`https://www.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5865f2] hover:text-[#4752c4] transition-colors inline-flex items-center gap-1 mt-1"
                    >
                      <span>Open in Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Interactive Card Component
export function InteractiveCard({
  cardConfig,
  className = "",
  sessionId,
  userId,
  messageId,
  onVoteUpdate,
}: InteractiveCardProps) {
  return (
    <div className={`my-2 ${className}`}>
      {cardConfig.type === "restaurant_recommendation" && (
        <RestaurantRecommendationCard config={cardConfig.config} />
      )}
      {cardConfig.type === "voting" && (
        <VotingCard
          config={cardConfig.config}
          sessionId={sessionId}
          userId={userId}
          messageId={messageId}
          onVoteUpdate={onVoteUpdate}
        />
      )}
      {cardConfig.type === "reminder" && (
        <ReminderCard config={cardConfig.config} />
      )}
    </div>
  );
}

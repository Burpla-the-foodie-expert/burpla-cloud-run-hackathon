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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

    if (restaurant.location_coordinates?.latitude && restaurant.location_coordinates?.longitude) {
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
                    <img
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
}: {
  config: VotingCardConfig;
}) {
  const { question, options, totalVotes, allowVoting = false, onVote } = config;

  // Normalize vote counts (handle both votes and number_of_vote fields)
  const normalizedOptions = options.map((opt) => ({
    ...opt,
    voteCount: opt.votes || opt.number_of_vote || 0,
  }));

  // Calculate percentages
  const optionsWithPercentages = normalizedOptions.map((opt) => ({
    ...opt,
    percentage:
      totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
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
          <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
          <span>•</span>
          <span>{options.length} option{options.length !== 1 ? "s" : ""}</span>
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
          const mapUri =
            option.map || option.hyperlink || option.googleMapsUri;

          return (
            <div
              key={option.id || index}
              className="p-4 hover:bg-[#36393f] transition-colors"
            >
              <div className="flex gap-4 mb-3">
                {imageUri && (
                  <div className="flex-shrink-0">
                    <img
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
                  {allowVoting && onVote && (
                    <button
                      onClick={() => onVote(option.id || "")}
                      className="px-3 py-1 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm rounded transition-colors"
                    >
                      Vote
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
function ReminderCard({
  config,
}: {
  config: ReminderCardConfig;
}) {
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
}: InteractiveCardProps) {
  return (
    <div className={`my-2 ${className}`}>
      {cardConfig.type === "restaurant_recommendation" && (
        <RestaurantRecommendationCard config={cardConfig.config} />
      )}
      {cardConfig.type === "voting" && (
        <VotingCard config={cardConfig.config} />
      )}
      {cardConfig.type === "reminder" && (
        <ReminderCard config={cardConfig.config} />
      )}
    </div>
  );
}


/**
 * Google Places API integration for restaurant recommendations
 */

const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

interface PlaceSearchResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: Array<{ name?: string }>;
  googleMapsUri?: string;
  reviews?: Array<{ text?: { text?: string } }>;
}

interface Restaurant {
  id?: string;
  name?: string;
  displayName?: string | { text?: string };
  address?: string;
  formattedAddress?: string;
  location?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  distance?: number;
  photoUri?: string;
  mapUri?: string;
  googleMapsUri?: string;
  hyperlink?: string;
  placeId?: string;
  types?: string[];
  location_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Search for places using Google Places API
 */
export async function searchPlaces(
  query: string,
  apiKey: string
): Promise<Restaurant[]> {
  try {
    const fieldMask =
      "places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.types,places.location,places.photos,places.googleMapsUri";

    const response = await fetch(GOOGLE_PLACES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({ textQuery: query }),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    const places = (data.places || []).slice(0, 10); // Limit to 10 results

    const restaurants: Restaurant[] = await Promise.all(
      places.map(async (place: PlaceSearchResult) => {
        const restaurant: Restaurant = {
          id: place.id,
          placeId: place.id,
          name:
            typeof place.displayName === "string"
              ? place.displayName
              : place.displayName?.text || "Unknown",
          displayName: place.displayName,
          formattedAddress: place.formattedAddress,
          address: place.formattedAddress,
          location: place.formattedAddress,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          priceLevel: place.priceLevel
            ? parseInt(place.priceLevel.replace("PRICE_LEVEL_", ""))
            : undefined,
          googleMapsUri: place.googleMapsUri,
          mapUri: place.googleMapsUri,
          hyperlink: place.googleMapsUri,
          types: place.types,
          location_coordinates: place.location
            ? {
                latitude: place.location.latitude,
                longitude: place.location.longitude,
              }
            : undefined,
        };

        // Get photo if available
        if (place.photos && place.photos.length > 0 && place.photos[0].name) {
          const photoName = place.photos[0].name;
          restaurant.photoUri = `${GOOGLE_PLACES_DETAILS_URL}/${photoName}/media?key=${apiKey}&maxHeightPx=400&maxWidthPx=400`;
        }

        // Get place details for reviews
        try {
          const detailsResponse = await fetch(
            `${GOOGLE_PLACES_DETAILS_URL}/${place.id}`,
            {
              headers: {
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "reviews",
              },
            }
          );

          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            // Store first review if available (for vote cards)
            // Reviews would be available in the details
          }
        } catch (error) {
          // Continue without reviews if details fetch fails
          console.debug("Could not fetch place details:", error);
        }

        return restaurant;
      })
    );

    return restaurants;
  } catch (error: any) {
    console.error("Error searching places:", error);
    throw new Error(`Failed to search places: ${error.message}`);
  }
}

/**
 * Get place details for vote card generation
 */
export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{
  name?: string;
  address?: string;
  rating?: number;
  review?: string;
  photoUri?: string;
  googleMapsUri?: string;
}> {
  try {
    const fieldMask =
      "id,displayName,formattedAddress,rating,userRatingCount,photos,googleMapsUri,reviews";

    const response = await fetch(`${GOOGLE_PLACES_DETAILS_URL}/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }

    const place = await response.json();

    const name =
      typeof place.displayName === "string"
        ? place.displayName
        : place.displayName?.text || "Unknown";

    const photoUri =
      place.photos && place.photos.length > 0 && place.photos[0].name
        ? `${GOOGLE_PLACES_DETAILS_URL}/${place.photos[0].name}/media?key=${apiKey}&maxHeightPx=400&maxWidthPx=400`
        : undefined;

    const review =
      place.reviews && place.reviews.length > 0
        ? place.reviews[0].text?.text
        : undefined;

    return {
      name,
      address: place.formattedAddress,
      rating: place.rating,
      review: review || `${place.rating?.toFixed(1) || "N/A"}/5.0 (${
        place.userRatingCount?.toLocaleString() || 0
      } reviews)`,
      photoUri,
      googleMapsUri: place.googleMapsUri,
    };
  } catch (error: any) {
    console.error("Error getting place details:", error);
    throw new Error(`Failed to get place details: ${error.message}`);
  }
}


"""
Restaurant recommendation tools using Google Places API
"""
import os
import requests
from typing import Optional, List, Dict, Any


def search_restaurants(
    location: str,
    radius: int = 5000,
    keyword: Optional[str] = None,
    min_rating: Optional[float] = None,
    price_level: Optional[int] = None,
    open_now: bool = False
) -> Dict[str, Any]:
    """
    Search for restaurant recommendations using Google Places API.

    Args:
        location: Location to search (e.g., "New York" or "40.7128,-74.0060")
        radius: Search radius in meters (default: 5000, max: 50000)
        keyword: Keyword to search for (e.g., "italian", "pizza", "vegan")
        min_rating: Minimum rating (0-5)
        price_level: Price level (1-4, where 1 is cheapest)
        open_now: Filter for restaurants open now

    Returns:
        Dictionary containing restaurant recommendations with details
    """
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        return {
            "error": "GOOGLE_API_KEY not found in environment variables",
            "restaurants": []
        }

    # First, geocode the location if it's not coordinates
    if "," not in location:
        geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        geocode_params = {
            "address": location,
            "key": api_key
        }

        try:
            geocode_response = requests.get(geocode_url, params=geocode_params)
            geocode_data = geocode_response.json()

            if geocode_data.get("status") != "OK":
                return {
                    "error": f"Could not geocode location: {geocode_data.get('status')}",
                    "restaurants": []
                }

            location_data = geocode_data["results"][0]["geometry"]["location"]
            location = f"{location_data['lat']},{location_data['lng']}"
        except Exception as e:
            return {
                "error": f"Geocoding failed: {str(e)}",
                "restaurants": []
            }

    # Search for restaurants using Places API
    places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    params = {
        "location": location,
        "radius": min(radius, 50000),  # Max 50km
        "type": "restaurant",
        "key": api_key
    }

    if keyword:
        params["keyword"] = keyword

    if open_now:
        params["opennow"] = "true"

    try:
        response = requests.get(places_url, params=params)
        data = response.json()

        if data.get("status") not in ["OK", "ZERO_RESULTS"]:
            return {
                "error": f"Places API error: {data.get('status')}",
                "restaurants": []
            }

        restaurants = []

        for place in data.get("results", []):
            # Apply filters
            rating = place.get("rating", 0)
            place_price_level = place.get("price_level", 0)

            # Skip if doesn't meet minimum rating
            if min_rating and rating < min_rating:
                continue

            # Skip if doesn't match price level
            if price_level and place_price_level != price_level:
                continue

            # Get place details for reviews
            place_id = place.get("place_id")
            details = get_place_details(place_id, api_key)

            restaurant_info = {
                "name": place.get("name"),
                "address": place.get("vicinity"),
                "location": place.get("geometry", {}).get("location", {}),
                "rating": rating,
                "total_ratings": place.get("user_ratings_total", 0),
                "price_level": place_price_level,
                "types": place.get("types", []),
                "opening_hours": place.get("opening_hours", {}).get("open_now"),
                "place_id": place_id,
                "reviews": details.get("reviews", [])[:3]  # Top 3 reviews
            }

            restaurants.append(restaurant_info)

        # Sort by rating (highest first)
        restaurants.sort(key=lambda x: x["rating"], reverse=True)

        return {
            "location": location,
            "total_results": len(restaurants),
            "restaurants": restaurants[:10]  # Return top 10
        }

    except Exception as e:
        return {
            "error": f"Failed to search restaurants: {str(e)}",
            "restaurants": []
        }


def get_place_details(place_id: str, api_key: str) -> Dict[str, Any]:
    """
    Get detailed information about a place including reviews.

    Args:
        place_id: Google Places ID
        api_key: Google API key

    Returns:
        Dictionary containing place details
    """
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"

    params = {
        "place_id": place_id,
        "fields": "name,rating,review,formatted_phone_number,website,opening_hours",
        "key": api_key
    }

    try:
        response = requests.get(details_url, params=params)
        data = response.json()

        if data.get("status") == "OK":
            result = data.get("result", {})

            # Format reviews
            reviews = []
            for review in result.get("reviews", [])[:3]:
                reviews.append({
                    "author": review.get("author_name"),
                    "rating": review.get("rating"),
                    "text": review.get("text"),
                    "time": review.get("relative_time_description")
                })

            return {
                "reviews": reviews,
                "phone": result.get("formatted_phone_number"),
                "website": result.get("website"),
                "opening_hours": result.get("opening_hours", {}).get("weekday_text", [])
            }
    except Exception as e:
        print(f"Error getting place details: {e}")

    return {"reviews": []}


# Tool definition for Google ADK Agent
restaurant_search_tool = {
    "function_declarations": [
        {
            "name": "search_restaurants",
            "description": "Search for restaurant recommendations based on location, rating, price, and other criteria. Returns restaurant details including location, reviews, and ratings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Location to search for restaurants (e.g., 'New York', 'San Francisco', or coordinates like '40.7128,-74.0060')"
                    },
                    "radius": {
                        "type": "integer",
                        "description": "Search radius in meters (default: 5000, max: 50000)",
                        "default": 5000
                    },
                    "keyword": {
                        "type": "string",
                        "description": "Optional keyword to filter restaurants (e.g., 'italian', 'sushi', 'vegan')"
                    },
                    "min_rating": {
                        "type": "number",
                        "description": "Minimum rating from 0 to 5"
                    },
                    "price_level": {
                        "type": "integer",
                        "description": "Price level from 1 (cheapest) to 4 (most expensive)"
                    },
                    "open_now": {
                        "type": "boolean",
                        "description": "Filter for restaurants that are currently open",
                        "default": False
                    }
                },
                "required": ["location"]
            }
        }
    ]
}

import os
import requests
import uuid
import googlemaps
from typing import List, Optional
from langchain_core.tools import tool
from dotenv import load_dotenv
from googlemaps.distance_matrix import distance_matrix as get_distance_matrix

load_dotenv(override=True)

@tool
def distance_matrix(origin: str, destination: str, mode: str = 'driving') -> dict:
    """
    Retrieves the distance matrix between an origin and a destination using Google Maps API.

    Args:
        origin (str): The starting location (e.g., "Houston, TX").
        destination (str): The ending location (e.g., "Austin, TX").
        mode (str): The mode of transportation (e.g., "driving", "walking", "bicycling", "transit").

    Returns:
        dict: A dictionary containing the distance matrix information or error message.
    """
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        gmaps = googlemaps.Client(key=api_key)
        result = get_distance_matrix(
            gmaps,
            origins=[origin],
            destinations=[destination],
            mode=mode,
            units="imperial"
        )
        return result
    except Exception as e:
        return {"error": f"Distance Matrix API Request failed: {e}"}

@tool
def google_places_text_search(text_query: str) -> dict:
    """
    Searches for places using Google Places API (New) based on a text query.
    Use this tool to find restaurants or places to eat when the user asks for recommendations.

    Args:
        text_query (str): The text query to search for places (e.g., "best pizza in New York").

    Returns:
        dict: A dictionary containing the search results from the Places API with formatted options.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    api_url = "https://places.googleapis.com/v1/places:searchText"

    field_mask = "places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.types,places.photos,places.googleMapsUri"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask
    }
    payload = {"textQuery": text_query}

    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()

        result = {"type": "recommendation", "options": []}
        places = response.json().get('places', [])

        # Defensive check: Ensure options is a list
        if not isinstance(result.get('options'), list):
            print(f"WARNING: result['options'] was not a list: {type(result.get('options'))}. Resetting to empty list.")
            result['options'] = []

        for place in places:
            photo_uri = None
            if place.get("photos"):
                photo_name = place["photos"][0].get("name")
                if photo_name:
                    photo_uri = f"https://places.googleapis.com/v1/{photo_name}/media?key={api_key}&maxHeightPx=400&maxWidthPx=400"

            option = {
                'restaurant_id': place.get('id', 'N/A'),
                'restaurant_name': place.get('displayName', {}).get('text', 'Unknown'),
                'description': place.get('formattedAddress', 'Address not available'),
                'image': photo_uri or "",
                'rating': str(place.get('rating', 'N/A')),
                'userRatingCount': place.get('userRatingCount', 0),
                'formattedAddress': place.get('formattedAddress', 'N/A'),
                'priceLevel': str(place.get('priceLevel', 'N/A')),
                'map': place.get('googleMapsUri', 'N/A')
            }

            # Double check before appending
            if isinstance(result['options'], list):
                result['options'].append(option)
            else:
                 print(f"ERROR: result['options'] became {type(result['options'])} unexpectedly. Cannot append.")

        return result
    except requests.exceptions.RequestException as e:
        return {"error": f"Places API Request failed: {e}", "type": "recommendation"}

@tool
def generate_vote(place_ids: List[str]) -> dict:
    """
    Generates voting options based on a list of place IDs using Google Places API.
    Use this tool when the user wants to create a vote or poll for restaurants.

    Args:
        place_ids (List[str]): A list of place IDs to generate voting options for.

    Returns:
        dict: A dictionary containing the voting options formatted for the frontend.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    field_mask = "id,displayName,formattedAddress,location,rating,userRatingCount,photos,googleMapsUri,reviews"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask
    }

    vote_options = []

    for place_id in place_ids:
        details_url = f"https://places.googleapis.com/v1/places/{place_id}"

        try:
            response = requests.get(details_url, headers=headers)
            response.raise_for_status()
            place = response.json()

            photo_uri = None
            if place.get("photos"):
                photo_name = place["photos"][0].get("name")
                if photo_name:
                    photo_uri = f"https://places.googleapis.com/v1/{photo_name}/media?key={api_key}&maxHeightPx=400&maxWidthPx=400"

            vote_option = {
                'restaurant_id': place_id,
                'restaurant_name': place.get("displayName", {}).get("text"),
                'description': place.get("formattedAddress"),
                'image': photo_uri or "",
                'rating': place.get('rating', 'N/A'),
                'userRatingCount': place.get('userRatingCount', 0),
                'number_of_vote': 0,
                'map': place.get("googleMapsUri")
            }
            vote_options.append(vote_option)

        except requests.exceptions.RequestException as e:
            vote_options.append({
                "error": f"Failed to fetch details for {place_id}: {e}",
                "placeId": place_id
            })

    res = {
        'message_id': f"msg-{str(uuid.uuid4())}",
        "sender_name": "Burpla",
        "type": "vote_card",
        'vote_options': vote_options
    }

    return res

@tool
def google_places_get_id(restaurant_name: str) -> dict:
    """
    Retrieves the Google Place ID for a given restaurant name using the Places API.
    Use this tool to find the ID of a restaurant when you only have its name.

    Args:
        restaurant_name (str): The name of the restaurant to search for.

    Returns:
        dict: A dictionary containing either the place ID or an error message.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    api_url = "https://places.googleapis.com/v1/places:searchText"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName"
    }
    payload = {"textQuery": restaurant_name}

    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        places = data.get("places", [])

        if not places:
            return {"error": f"No places found for '{restaurant_name}'"}

        # Get the first matching place
        place = places[0]
        place_id = place.get("id", None)

        if not place_id:
            return {"error": f"Place ID not found for '{restaurant_name}'"}

        return {
            "restaurant_name": place.get("displayName", {}).get("text", restaurant_name),
            "restaurant_id": place_id
        }

    except requests.exceptions.RequestException as e:
        return {"error": f"Places API Request failed: {e}"}

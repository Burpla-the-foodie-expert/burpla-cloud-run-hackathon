import os, requests, uuid
import googlemaps
from dotenv import load_dotenv
from typing import List

load_dotenv(override=True)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def distance_matrix(origin: str, destination: str, mode: str = 'driving') -> None:
    """
        Retrieves the distance matrix between an origin and a destination using Google Maps API.

        Args:
        origin (str): The starting location (e.g., "Houston, TX").
        destination (str): The ending location (e.g., "Austin, TX").
        mode (str): The mode of transportation (e.g., "driving", "walking", "bicycling", "transit").

        Returns:
        dict: A dictionary containing the distance matrix information.

    """
    try:
        gmaps = googlemaps.Client(key=GOOGLE_API_KEY)
        result = gmaps.distance_matrix(
            origins=[origin],
            destinations=[destination],
            mode="driving",
            units="imperial"
        )
    except Exception as e:
        return {"error": f"Distance Matrix API Request failed: {e}"}
    return result


def google_places_text_search(text_query: str) -> dict:
    """
        Searches for places using Google Places API based on a text query.
        Args:
            text_query (str): The text query to search for places (e.g., "best pizza in New York").
        Returns:
            dict: A dictionary containing the search results from the Places API.
    """

    api_url = "https://places.googleapis.com/v1/places:searchText"
    field_mask = "places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.types"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": field_mask
    }
    payload = {"textQuery": text_query}

    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        result["type"] = "recommendation"
        return result
    except requests.exceptions.RequestException as e:
        return {"error": f"Places API Request failed: {e}", "type": "recommendation"}


def generate_vote(place_ids: List[str]) -> dict:
    """
        Generates voting options based on a list of place IDs using Google Places API.
        Args:
            place_ids (List[str]): A list of place IDs to generate voting options for.
        Returns:
            dict: A dictionary containing the voting options.
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
                'review': f"{place.get('rating', 'N/A')}/5.0 ({place.get('userRatingCount', 0)} reviews)",
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





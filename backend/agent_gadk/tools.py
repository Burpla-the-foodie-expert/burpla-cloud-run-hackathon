import os, requests, uuid, warnings
warnings.filterwarnings('ignore')

import googlemaps
from dotenv import load_dotenv
from typing import List

load_dotenv(override=True)
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
        api_key = os.getenv("GOOGLE_API_KEY")
        gmaps = googlemaps.Client(key=api_key)
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
        Searches for places using Google Places API (New) based on a text query.
        Args:
            text_query (str): The text query to search for places (e.g., "best pizza in New York").
        Returns:
            dict: A dictionary containing the search results from the Places API.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    api_url = "https://places.googleapis.com/v1/places:searchText"
    
    # Corrected/Expanded Field Mask (standard best practice)
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

        # Check for the 'places' key in the response JSON
        places = response.json().get('places', [])
        # Check if places_cache variable exitss

        for place in places:
            photo_uri = None
            if place.get("photos"):
                # photos[0].name contains the photo resource name
                photo_name = place["photos"][0].get("name")
                if photo_name:
                    # Construct the correct Photo Media URL
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
            result['options'].append(option)

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

# print(google_places_text_search("best pizza in New York"))
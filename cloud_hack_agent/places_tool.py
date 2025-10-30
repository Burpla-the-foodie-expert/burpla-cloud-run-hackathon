import os
import requests
from typing import List

def google_places_text_search(text_query: str) -> dict:
    """
    
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    api_url = "https://places.googleapis.com/v1/places:searchText"
    field_mask = "places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.types"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
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

            review_text = None
            if place.get("reviews"):
                review_text = place["reviews"][0].get("text", {}).get("text")

            vote_option = {
                "name": place.get("displayName", {}).get("text"),
                "location": place.get("formattedAddress"),
                "rating": place.get("rating"),
                "userRatingCount": place.get("userRatingCount"),
                "photoUri": photo_uri,
                "review": review_text,
                "hyperlink": place.get("googleMapsUri"),
                "placeId": place.get("id")
            }
            vote_options.append(vote_option)

        except requests.exceptions.RequestException as e:
            vote_options.append({
                "error": f"Failed to fetch details for {place_id}: {e}",
                "placeId": place_id
            })

    return {
        "type": "vote",
        "options": vote_options
    }



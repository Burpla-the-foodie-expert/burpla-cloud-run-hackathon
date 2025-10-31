import os
import requests
from typing import List
from pydantic import BaseModel

from dotenv import load_dotenv

load_dotenv(override=True)

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

from pydantic import BaseModel, Field
from typing import List, Optional

# 1. Nested Model: Defines a single voting option (a restaurant)
class VoteOption(BaseModel):
    """Represents a single restaurant option in the vote card."""
    restaurant_id: str
    restaurant_name: str
    description: str
    image: Optional[str] = Field(default="")
    review: str
    number_of_vote: int
    map: str

# 2. Nested Model: Defines the content structure of the vote_card type
class Content(BaseModel):
    """The content payload specific to the 'vote_card' type."""
    text: str
    title: str
    vote_options: List[VoteOption]

# 3. Main Model: The complete message structure
class VoteCard(BaseModel):
    """The complete message structure for a 'vote_card'."""
    message_id: str = Field(alias="message_id")
    sender_id: int = Field(alias="sender_id")
    sender_name: str = Field(alias="sender_name")
    type: str = Field(default="vote_card") # Assuming 'vote_card' is a fixed value
    content: Content
    

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




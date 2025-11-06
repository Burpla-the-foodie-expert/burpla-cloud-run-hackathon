import warnings
warnings.filterwarnings('ignore')

from dotenv import load_dotenv
from google.adk.agents import Agent
from config import GEMINI_FLASH, GEMINI_PRO
from agent.tools import generate_vote
from pydantic import BaseModel, Field
from typing import List, Optional

load_dotenv(override=True)

class VoteOption(BaseModel):
    """Single restaurant voting option."""
    restaurant_id: str = Field(..., description="Unique restaurant ID. Must be provided.")
    restaurant_name: Optional[str] = Field(None, description="Restaurant display name.")
    description: Optional[str] = Field(None, description="Short summary or cuisine info.")
    image: str = Field("", description="Image URL of the restaurant.")
    rating: str = Field("N/A", description="Average rating score (string format).")
    userRatingCount: int = Field(0, description="Number of user reviews.")
    number_of_vote: int = Field(0, description="Number of votes this restaurant received.")
    map: Optional[str] = Field(None, description="Google Maps URL for location.")

    class Config:
        json_schema_extra = {
            "example": {
                "restaurant_id": "ChIJ123",
                "restaurant_name": "Sushi Zen",
                "description": "Authentic Japanese sushi bar with omakase options.",
                "image": "https://example.com/sushi.jpg",
                "rating": "4.8",
                "userRatingCount": 321,
                "number_of_vote": 12,
                "map": "https://maps.google.com/?q=Sushi+Zen"
            }
        }


class VoteResponse(BaseModel):
    """Response schema for the vote creation agent."""
    message_id: str = Field(..., description="Unique message ID of this vote response.")
    sender_name: str = Field(..., description="Name of the agent or user who initiated the vote.")
    type: str = Field("vote_card", description="Always 'vote_card'.")
    vote_options: List[VoteOption] = Field(..., description="List of restaurant options for voting.")

    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "msg_001",
                "sender_name": "pipeline_vote_agent",
                "type": "vote_card",
                "vote_options": [
                    VoteOption.Config.json_schema_extra["example"],
                    {
                        "restaurant_id": "ChIJ456",
                        "restaurant_name": "Luigi’s Trattoria",
                        "description": "Italian trattoria famous for homemade pasta.",
                        "image": "https://example.com/luigi.jpg",
                        "rating": "4.6",
                        "userRatingCount": 210,
                        "number_of_vote": 0,
                        "map": "https://maps.google.com/?q=Luigi’s+Trattoria"
                    }
                ]
            }
        }

pipeline_vote_agent = Agent(
    name="pipeline_vote_agent",
    model=GEMINI_PRO,
    description="Creates structured voting polls from restaurant IDs found in prior conversation.",
    instruction=f"""
        Extract all restaurant_id values from previous messages (typically from recommendation cards).
        Then call:
            generate_vote(place_ids=[list_of_ids])

        Return the result strictly following this JSON format:
        {VoteResponse.model_json_schema()['example']}

        Notes:
        - Always set "type" to "vote_card".
        - Ensure "vote_options" is a list of valid restaurant options with their IDs, names, and vote counts.
    """,
    tools=[generate_vote],
    output_schema=VoteResponse,
    disallow_transfer_to_parent=True
)

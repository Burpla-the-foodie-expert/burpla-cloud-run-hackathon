from pydantic import BaseModel, Field
from fastapi import Body
from typing import Optional, List, Dict, Any, Literal
import uuid


class VoteOption(BaseModel):
    """Single restaurant voting option."""

    restaurant_id: str = Field(
        ..., description="Unique restaurant ID. Must be provided."
    )
    restaurant_name: Optional[str] = Field(None, description="Restaurant display name.")
    description: Optional[str] = Field(
        None, description="Short summary or cuisine info."
    )
    image: str = Field("", description="Image URL of the restaurant.")
    rating: str = Field("N/A", description="Average rating score (string format).")
    userRatingCount: int = Field(0, description="Number of user reviews.")
    number_of_vote: int = Field(
        0, description="Number of votes this restaurant received."
    )
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
                "map": "https://maps.google.com/?q=Sushi+Zen",
            }
        }


class VoteResponse(BaseModel):
    """Response schema for the vote creation agent."""

    message_id: str = Field(..., description="Unique message ID of this vote response.")
    sender_name: str = Field(
        ..., description="Name of the agent or user who initiated the vote."
    )
    type: Literal["vote_card"] = Field(..., description="Always 'vote_card'")
    vote_options: List[VoteOption] = Field(
        ..., description="List of restaurant options for voting."
    )

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
                        "vote_user_id_list": [],
                        "map": "https://maps.google.com/?q=Luigi’s+Trattoria",
                    },
                ],
            }
        }


class RecommendationOptions(BaseModel):
    """Single restaurant recommendation option."""

    restaurant_id: str = Field(
        default=None, description="Unique restaurant ID, must be provided"
    )
    restaurant_name: str = Field(..., description="Name of the restaurant")
    description: str = Field(
        ..., description="Short description or reason for recommendation"
    )
    image: Optional[str] = Field(default="", description="URL of the restaurant image")
    rating: str = Field(default="N/A", description="Average rating of the restaurant")
    userRatingCount: int = Field(..., description="Number of user ratings")
    formattedAddress: str = Field(..., description="Full address of the restaurant")
    priceLevel: Optional[str] = Field(
        default="N/A", description="Price level (e.g., $, $$, $$$)"
    )
    map: str = Field(..., description="Google Maps URL")

    class Config:
        json_schema_extra = {
            "example": {
                "restaurant_id": "12345",
                "restaurant_name": "Luigi’s Trattoria",
                "description": "Cozy Italian spot famous for its pasta and wine list.",
                "image": "https://example.com/image.jpg",
                "rating": "4.6",
                "userRatingCount": 240,
                "formattedAddress": "123 Main St, Houston, TX",
                "priceLevel": "$$",
                "map": "https://maps.google.com/?q=Luigi’s+Trattoria",
            }
        }

class RecommendationResult(BaseModel):
    """Top-level response schema for the agent output."""

    type: Literal["recommendation_card"] = Field(
        ..., description="Always 'recommendation_card'"
    )
    options: List[RecommendationOptions] = Field(
        ..., description="List of restaurant recommendation cards"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "type": "recommendation_card",
                "options": [RecommendationOptions.Config.json_schema_extra["example"]],
            }
        }

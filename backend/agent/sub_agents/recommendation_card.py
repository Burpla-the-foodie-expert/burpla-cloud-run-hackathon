from dotenv import load_dotenv
from google.adk.agents import Agent
from google.genai import types
from agent.config import ROOT_MODEL_NAME
import logging, warnings
from agent.tools import google_places_text_search
from pydantic import BaseModel, Field
from typing import List, Optional

logging.basicConfig(level=logging.ERROR)
warnings.filterwarnings("ignore")
load_dotenv(override=True)


class RecommendationOptions(BaseModel):
    """Single restaurant recommendation option."""
    restaurant_id: Optional[str] = Field(default=None, description="Unique restaurant ID (optional)")
    restaurant_name: str = Field(..., description="Name of the restaurant")
    description: str = Field(..., description="Short description or reason for recommendation")
    image: Optional[str] = Field(default="", description="URL of the restaurant image")
    rating: str = Field(default="N/A", description="Average rating of the restaurant")
    userRatingCount: int = Field(..., description="Number of user ratings")
    formattedAddress: str = Field(..., description="Full address of the restaurant")
    priceLevel: Optional[str] = Field(default="N/A", description="Price level (e.g., $, $$, $$$)")
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
                "map": "https://maps.google.com/?q=Luigi’s+Trattoria"
            }
        }


class RecommendationResult(BaseModel):
    """Top-level response schema for the agent output."""
    type: str = Field(..., description="Always 'recommendation_card'")
    options: List[RecommendationOptions] = Field(..., description="List of restaurant recommendation cards")
    error: Optional[str] = Field(default=None, description="Error message, if any")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "recommendation_card",
                "options": [
                    RecommendationOptions.Config.json_schema_extra["example"]
                ],
                "error": None
            }
        }


pipeline_recommendation_agent = Agent(
    name="pipeline_recommendation_agent",
    model=ROOT_MODEL_NAME,
    description="Searches for restaurants and returns structured recommendation cards.",
    instruction=f"""
Return the result in the following JSON format:

{RecommendationResult.model_json_schema()["example"]}

Always set "type" to "recommendation_card".
If an error occurs, include an "error" message string.
    """,
    tools=[google_places_text_search],
    output_schema=RecommendationResult
)

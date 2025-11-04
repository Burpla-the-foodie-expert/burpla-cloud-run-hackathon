# @title Import necessary libraries
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.genai import types
from agent.config import ROOT_MODEL_NAME
import logging, warnings
from agent.tools import google_places_text_search
from pydantic import BaseModel
from typing import List, Optional

logging.basicConfig(level=logging.ERROR)
warnings.filterwarnings("ignore")
load_dotenv(override=True)


class RecommendationOptions(BaseModel):
    restaurant_id: Optional[str] = None  # Made optional
    restaurant_name: str
    description: str
    image: Optional[str] = ""
    rating: str = "N/A"
    userRatingCount: int
    formattedAddress: str
    priceLevel: Optional[str] = "N/A"
    map: str

class RecommendationResult(BaseModel):
    type: str
    options: List[RecommendationOptions]
    error: Optional[str] = None

pipeline_recommendation_agent = Agent(
    name="pipeline_recommendation_agent",
    model=ROOT_MODEL_NAME,
    description="Searches for restaurants and returns recommendation cards",
    instruction="""
Call google_places_text_search with the user's query and return the result.

Example:
User asks: "Italian restaurants in Houston"
You call: google_places_text_search("Italian restaurants in Houston")
Return: The complete result from the tool

That's it. Just one tool call.
    """,
    tools=[google_places_text_search],
    output_schema=RecommendationResult
)

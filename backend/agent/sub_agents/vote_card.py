# @title Import necessary libraries
from dotenv import load_dotenv
from google.adk.agents import Agent, SequentialAgent
from google.genai import types # For creating message Content/Parts
from agent.config import ROOT_MODEL_NAME, SUB_MODEL_NAME
import logging, warnings
from agent.tools import generate_vote
from google.adk.tools import google_search
from pydantic import BaseModel
from typing import List, Optional
logging.basicConfig(level=logging.ERROR)

warnings.filterwarnings("ignore")

load_dotenv(override=True)


class VoteOption(BaseModel):
    restaurant_id: str
    restaurant_name: Optional[str]
    description: Optional[str]
    image: str = ""
    rating: str = "N/A"
    userRatingCount: int = 0
    number_of_vote: int = 0
    map: Optional[str]

class VoteResponse(BaseModel):
    message_id: str
    sender_name: str
    type: str = "vote_card"
    vote_options: List[VoteOption]

pipeline_vote_agent = Agent(
    name="pipeline_vote_agent",
    model=ROOT_MODEL_NAME,
    description="Creates voting polls from restaurant IDs in conversation",
    instruction="""
Extract restaurant IDs from the conversation and create a vote.

Find all restaurant_id values from previous messages (usually in recommendation cards).
Collect them into a list.
Call generate_vote(place_ids=[ids]) with that list.
Return the result.

Example: If conversation has IDs "ChIJ123", "ChIJ456", call generate_vote(place_ids=["ChIJ123", "ChIJ456"])
    """,
    tools=[generate_vote]
)

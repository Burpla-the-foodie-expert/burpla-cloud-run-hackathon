# @title Import necessary libraries
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.genai import types # For creating message Content/Parts
from agent.config import ROOT_MODEL_NAME
import logging

from agent.tools import generate_vote, google_places_text_search
logging.basicConfig(level=logging.ERROR)

import warnings
warnings.filterwarnings("ignore")

load_dotenv(override=True)

from pydantic import BaseModel
from typing import List

from pydantic import BaseModel
from typing import Optional

class VoteOptionSchema(BaseModel):
    restaurant_id: str
    restaurant_name: Optional[str]
    description: Optional[str]
    image: Optional[str]
    review: Optional[str]
    number_of_vote: int
    map: Optional[str]

class VoteSchema(BaseModel):
    message_id: str
    sender_name: str
    type: str
    vote_options: List[VoteOptionSchema]

generate_vote_agent = Agent(
    name="generate_vote_agent", # Give it a new version name
    model = ROOT_MODEL_NAME,
    description="The vote specialist agent. Handles request for generating voting options based on place IDs in the conversation.",
    instruction = """
        You are the Generate Vote Sub Agent. Your sole responsibility is to create voting base on the conversation.
        
        You have 2 tool: `generate_vote`, `google_places_text_search`.
        Use the `generate_vote` tool to create detailed voting options found in the conversation.
        Use the `google_places_text_search` tool to find place IDs if needed.

        If you successfully use the `generate_vote` tool, return its raw JSON output.
        If not enough information is available to create a vote, use the `generate_vote` tool with an empty list of place IDs.
    """,
    output_schema = VoteSchema,
    tools=[generate_vote, google_places_text_search]
)



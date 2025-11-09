import warnings
warnings.filterwarnings('ignore')

from dotenv import load_dotenv
from google.adk.agents import Agent
from config import GEMINI_FLASH, GEMINI_PRO
from agent_gadk.tools import generate_vote
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from base_models.agent_models import VoteResponse
from google.genai import types

load_dotenv(override=True)

gen_cfg = types.GenerateContentConfig(
    temperature=0,
)
# pipeline_vote_agent = Agent(
#     name="pipeline_vote_agent",
#     model=GEMINI_FLASH,
#     description="Creates structured voting polls from restaurant IDs found in prior conversation.",
#     instruction=f"""
#         Extract all restaurant_id values from previous messages (typically from recommendation cards).
#         Then call:
#             generate_vote(place_ids=[list_of_ids])

#         Return the result strictly following this JSON format:
#         {VoteResponse.model_json_schema()['example']}

#         Notes:
#         - Always set "type" to "vote_card".
#         - Ensure "vote_options" is a list of valid restaurant options with their IDs, names, and vote counts.
#         - number_of_vote: 0 (Always initialize to zero)
#         - vote_user_id_list": [], (Always initialize to empty list)
#     """,
#     tools=[generate_vote],
#     output_schema=VoteResponse,
# )

extract_id_agent = Agent(
    name="extract_id_agent",
    model=GEMINI_FLASH,
    description="Extracts restaurant/place IDs from previous conversation messages.",
    generate_content_config=gen_cfg,
    instruction="""
        Look through all previous messages in the conversation history and extract all restaurant_id or place_id values.
        Return only a valid JSON list of strings.

        Example valid output:
        ["ChIJ123abc456", "ChIJ789def012"]

        Rules:
        - Do not include duplicates.
        - Do not include commentary or code fences.
        - If no IDs found, return [].
    """,
)

validate_vote_agent = Agent(
    name="validate_vote_agent",
    model=GEMINI_FLASH,
    description="Calls generate_vote and ensures JSON validity. Retries until valid JSON is produced.",
    instruction="""
        You are responsible for generating a valid voting card JSON.
        Use the tool 'generate_vote(place_ids=[...])' with the IDs you receive.

        Steps:
        1. Call generate_vote with provided IDs.
        2. Check if the output is valid JSON executable according to VoteResponse.
        3. If invalid, retry up to 3 times until it parses correctly.
        4. Return only the final JSON (no extra text, no code fences).

        The JSON must match this schema:
        {
            "type": "vote_card",
            "vote_options": [...],
            "number_of_vote": 0,
            "vote_user_id_list": []
        }
    """,
    tools=[generate_vote],
    generate_content_config=gen_cfg,
    output_schema=VoteResponse,
)

pipeline_vote_agent = Agent(
    name="pipeline_vote_agent",
    model=GEMINI_FLASH,
    description="Coordinates a two-step vote creation process: extract restaurant IDs then generate a valid vote card JSON.",
    instruction="""
        You are the coordinator of the voting pipeline.

        Step 1: Delegate to 'extract_id_agent' to retrieve restaurant IDs from prior conversation.
        Step 2: Send those IDs to 'validate_vote_agent' to generate the final vote card.
        Step 3: Ensure the returned JSON conforms exactly to the VoteResponse schema.

        Output strictly as JSON (no markdown or code fences).
    """,
    sub_agents=[extract_id_agent, validate_vote_agent],
    generate_content_config=gen_cfg,
    output_schema=VoteResponse,
)


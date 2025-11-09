import warnings
warnings.filterwarnings('ignore')
from dotenv import load_dotenv
from google.adk.agents import Agent
from config import GEMINI_FLASH, GEMINI_PRO
from agent_gadk.tools import google_places_text_search
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from base_models.agent_models import RecommendationResult
from google.genai import types

load_dotenv(override=True)
gen_cfg = types.GenerateContentConfig(
    temperature=0.1,
)


pipeline_recommendation_agent = Agent(
    name="pipeline_recommendation_agent",
    model=GEMINI_FLASH,
    description="Searches for restaurants and returns structured recommendation cards.",
    instruction=f"""
        Return the result in the following JSON format:

        {RecommendationResult.model_json_schema()["example"]}

        Always set "type" to "recommendation_card".
        Restaurant id must be provided for each option.
    """,
    tools=[google_places_text_search],
    output_schema=RecommendationResult,
    generate_content_config=gen_cfg,
)

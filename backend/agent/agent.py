# @title Import necessary libraries
import os
import asyncio 
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm # For multi-model support
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types # For creating message Content/Parts
from agent.sub_agent import generate_vote_agent
from agent.config import SUB_MODEL_NAME
from agent.tools import distance_matrix, google_places_text_search
import logging
logging.basicConfig(level=logging.ERROR)

import warnings
warnings.filterwarnings("ignore")

load_dotenv(override=True)

root_agent = Agent(
    name="food_recommendation_agent", # Give it a new version name
    model = SUB_MODEL_NAME,
    description="The main coordinator agent. Handles places-to-eat request and distance request and delegate vote generation to specialists",
    instruction="""
        Your are the main Food Recommendation Agent coordinating a team. Your primary responsibility is to provide food place recommendations, distance information, and generate vote request.
        You have 2 tools:
            1. google_places_text_search: Handle requests for finding places to eat based on user queries.
            2. distance_matrix: Handle requests for calculating distances between locations.
        You have 1 specialized sub-agents: 
            1. 'generate_vote_agent': Handles generating detailed voting options based on place IDs. 

        Analyze the user's query. 
        If it's a request for finding places to eat, use 'google_places_text_search'. Also include some details about the restaurants found, such as name, description, rating, and number of reviews.
        If it's a distance calculation request, use 'distance_matrix'. Be sure to provide clear information about the distance and estimated travel time.
        If the user want to make a vote, delegate to 'generate_vote_agent'.
        
        For anything else, respond appropriately or state you cannot handle it
        """,
    tools=[google_places_text_search, distance_matrix], 
    sub_agents=[generate_vote_agent]
)
    
async def call_agent_async(query: str, runner, user_id, session_id):
    content = types.Content(role='user', parts=[types.Part(text=query)])
    final_response_text = "Agent did not produce a final response." 
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
        if event.is_final_response():
            if event.content and event.content.parts:
                final_response_text = event.content.parts[0].text
            elif event.actions and event.actions.escalate: # Handle potential errors/escalations
                final_response_text = f"Agent escalated: {event.error_message or 'No specific message.'}"
            break
    return final_response_text

async def run_conversation(query: str, app_name: str = "burbla", user_id: str = "something", session_id: str = "something"):
    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name = app_name, user_id = user_id, session_id = session_id
    )
    print(f"Session created: App='{app_name}', User='{user_id}', Session='{session_id}'")

    runner_agent_team = Runner( # Or use InMemoryRunner
        agent=root_agent,
        app_name=app_name,
        session_service=session_service
    )

    response = await call_agent_async(query = query,
                               runner = runner_agent_team,
                               user_id = user_id,
                               session_id = session_id)
    return response
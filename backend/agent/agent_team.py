# # @title Import necessary libraries
# import os
# import asyncio 
# from dotenv import load_dotenv
# from google.adk.agents import Agent
# from google.adk.models.lite_llm import LiteLlm # For multi-model support
# from google.adk.sessions import InMemorySessionService
# from google.adk.runners import Runner
# from google.genai import types # For creating message Content/Parts
# from config import ROOT_MODEL_NAME
# import logging
# logging.basicConfig(level=logging.ERROR)

# import warnings
# warnings.filterwarnings("ignore")

# load_dotenv(override=True)

# weather_agent_team = Agent(
#     name="food_recommendation_agent", # Give it a new version name
#     model = ROOT_MODEL_NAME,
#     description="The main coordinator agent. Handles weather requests and delegates greetings/farewells to specialists.",
#     instruction="You are the main Weather Agent coordinating a team. Your primary responsibility is to provide weather information. "
#                 "Use the 'get_weather' tool ONLY for specific weather requests (e.g., 'weather in London'). "
#                 "You have specialized sub-agents: "
#                 "1. 'greeting_agent': Handles simple greetings like 'Hi', 'Hello'. Delegate to it for these. "
#                 "2. 'farewell_agent': Handles simple farewells like 'Bye', 'See you'. Delegate to it for these. "
#                 "Analyze the user's query. If it's a greeting, delegate to 'greeting_agent'. If it's a farewell, delegate to 'farewell_agent'. "
#                 "If it's a weather request, handle it yourself using 'get_weather'. "
#                 "For anything else, respond appropriately or state you cannot handle it.",
#     description="The main coordinator agent. Handles places-to-eat request and distance request and delegate vote generation to specialists",
#     instruction="""
#         Your are the main Food Recommendation Agent coordinating a team. Your primary responsibility is to provide food place recommendations, distance information, and generate vote request.
#         You have 2 tools:
#             1. google_places_text_search: Handle requests for finding places to eat based on user queries.
#             2. distance_matrix: Handle requests for calculating distances between locations.
#         You have 1 specialized sub-agents: 
#             1. 'generate_vote_agent': Handles generating detailed voting options based on place IDs. 

#         Analyze the user's query. 
#         If it's a request for finding places to eat, use 'google_places_text_search'. 
#         If it's a distance calculation request, use 'distance_matrix'. 
#         If the user want to make a vote, delegate to 'generate_vote_agent'.
        
#         For anything else, respond appropriately or state you cannot handle it
#     """
#     tools=[get_weather], 
#     sub_agents=[greeting_agent, farewell_agent]
# )



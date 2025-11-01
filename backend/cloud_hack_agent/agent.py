from google.adk.agents import Agent
from .tools import google_places_text_search, generate_vote

root_agent = Agent(
    name="cloud_hack_agent",
    model="gemini-2.0-flash",
    description="Agent for place recommendations and vote generation",
    instruction="""Use google_places_text_search to find places and get place IDs.
Use generate_vote with place IDs to create detailed voting options with photos and reviews only when there are info about the places (places id). Return json response only with this tool.""",
    tools=[google_places_text_search, generate_vote]
)


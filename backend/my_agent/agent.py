from google.adk.agents.llm_agent import Agent
from .tools import search_restaurants, restaurant_search_tool

root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A helpful assistant that can search for restaurant recommendations.',
    instruction='''You are a helpful assistant that can search for restaurant recommendations.
    When users ask about restaurants, use the search_restaurants tool to find recommendations
    based on their location and preferences. Provide detailed information including ratings,
    reviews, location, and price level.''',
    tools=[restaurant_search_tool],
    functions=[search_restaurants]
)

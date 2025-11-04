from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import asyncio
import os

from google.genai import types
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService # Optional
from google.adk.planners import BasePlanner, BuiltInPlanner, PlanReActPlanner
from google.adk.models import LlmRequest

from google.genai.types import ThinkingConfig
from google.genai.types import GenerateContentConfig

import datetime
from zoneinfo import ZoneInfo

APP_NAME = "weather_app"
USER_ID = "1234"
SESSION_ID = "session1234"

def get_weather(city: str) -> dict:
    """Retrieves the current weather report for a specified city.

    Args:
        city (str): The name of the city for which to retrieve the weather report.

    Returns:
        dict: status and result or error msg.
    """
    if city.lower() == "new york":
        return {
            "status": "success",
            "report": (
                "The weather in New York is sunny with a temperature of 25 degrees"
                " Celsius (77 degrees Fahrenheit)."
            ),
        }
    else:
        return {
            "status": "error",
            "error_message": f"Weather information for '{city}' is not available.",
        }


def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city.

    Args:
        city (str): The name of the city for which to retrieve the current time.

    Returns:
        dict: status and result or error msg.
    """

    if city.lower() == "new york":
        tz_identifier = "America/New_York"
    else:
        return {
            "status": "error",
            "error_message": (
                f"Sorry, I don't have timezone information for {city}."
            ),
        }

    tz = ZoneInfo(tz_identifier)
    now = datetime.datetime.now(tz)
    report = (
        f'The current time in {city} is {now.strftime("%Y-%m-%d %H:%M:%S %Z%z")}'
    )
    return {"status": "success", "report": report}

# Step 1: Create a ThinkingConfig
thinking_config = ThinkingConfig(
    include_thoughts=True,   # Ask the model to include its thoughts in the response
    thinking_budget=256      # Limit the 'thinking' to 256 tokens (adjust as needed)
)
print("ThinkingConfig:", thinking_config)

# Step 2: Instantiate BuiltInPlanner
planner = BuiltInPlanner(
    thinking_config=thinking_config
)
print("BuiltInPlanner created.")

# Step 3: Wrap the planner in an LlmAgent
agent = LlmAgent(
    model="gemini-2.5-pro-preview-03-25",  # Set your model name
    name="weather_and_time_agent",
    instruction="You are an agent that returns time and weather",
    planner=planner,
    tools=[get_weather, get_current_time]
)

# Agent Interaction
async def call_agent(query):
    """Call the agent with a query and print the response."""
    try:
        # Session and Runner setup
        session_service = InMemorySessionService()

        # Create session asynchronously
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID
        )

        runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)

        # Create the user message
        content = types.Content(role='user', parts=[types.Part(text=query)])

        # Run the agent
        events = runner.run(user_id=USER_ID, session_id=SESSION_ID, new_message=content)

        for event in events:
            print(f"\nDEBUG EVENT: {event}\n")
            if event.is_final_response() and event.content:
                final_answer = event.content.parts[0].text.strip()
                print("\n🟢 FINAL ANSWER\n", final_answer, "\n")
    except Exception as e:
        print(f"❌ Error calling agent: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    # Check if API key is set
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Error: GOOGLE_API_KEY environment variable is not set.")
        print("Please add your Google API key to the .env file.")
        exit(1)

    print("🚀 Starting agent with planner...")
    asyncio.run(call_agent("If it's raining in New York right now, what is the current temperature?"))
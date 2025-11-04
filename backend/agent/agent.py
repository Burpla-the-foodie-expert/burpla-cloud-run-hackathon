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
from agent.config import SUB_MODEL_NAME, USE_FIRESTORE, GOOGLE_CLOUD_PROJECT, FIRESTORE_COLLECTION
from agent.tools import distance_matrix, google_places_text_search

import logging
logging.basicConfig(level=logging.ERROR)

import warnings
warnings.filterwarnings("ignore")

load_dotenv(override=True)

root_agent = Agent(
    name="food_recommendation_agent",
    model = SUB_MODEL_NAME,
    description="The main coordinator agent. Handles places-to-eat request, distance request, web search, and delegate vote generation to specialists",
    instruction="""
        You are the main Food Recommendation Agent coordinating a team. Your primary responsibility is to provide food place recommendations, distance information, up-to-date information, and generate vote requests.

        **Tools Available:**
        1. google_places_text_search: Find places to eat based on user queries
        2. distance_matrix: Calculate distances between locations

        **Sub-Agents Available:**
        1. generate_vote_agent: Creates detailed voting options from place IDs

        **How to Handle Requests:**

        1. **Finding Restaurants:**
           - Use 'google_places_text_search' tool to search for restaurants
           - When presenting results, include:
             * Restaurant name
             * Address
             * Rating and number of reviews
             * Place ID (important for vote generation)
           - Format example: "1. **Pho Saigon** - 123 Main St, 4.5★ (200 reviews) [ID: ChIJ...]"
           - Keep the place IDs in your response so they can be referenced later

        2. **Distance Calculations:**
           - Use 'distance_matrix' tool
           - Provide distance and estimated travel time

        3. **Creating Votes:**
           - When user asks to "create a vote", "generate vote", "make a poll", etc.
           - Delegate to 'generate_vote_agent' sub-agent immediately
           - The vote agent will:
             * Look at conversation history to find place IDs
             * Use google_places_text_search if needed
             * Call generate_vote tool to create the vote card
             * Return a JSON formatted vote
           - You don't need to do anything else - just delegate

        4. **General Conversation:**
           - Answer questions about previous searches
           - Provide recommendations based on the places search results
           - For anything outside your scope, politely state you cannot help

        **Important:**
        - Always include place IDs when showing restaurant results
        - Conversation history is shared, so the vote agent can see previous restaurants
        - When user asks for vote, immediately delegate to generate_vote_agent
        """,
    tools=[google_places_text_search, distance_matrix],
    sub_agents=[generate_vote_agent]
)

# Global session service to maintain conversation history
if USE_FIRESTORE:
    if not GOOGLE_CLOUD_PROJECT:
        raise ValueError("GOOGLE_CLOUD_PROJECT must be set when USE_FIRESTORE=true")
    from agent.firestore_session import FirestoreSessionService
    print(f"✓ Using Firestore for session storage")
    print(f"  → Project: {GOOGLE_CLOUD_PROJECT}")
    print(f"  → Collection: {FIRESTORE_COLLECTION}")
    session_service = FirestoreSessionService(
        project_id=GOOGLE_CLOUD_PROJECT,
        collection_name=FIRESTORE_COLLECTION
    )
else:
    print("⚠️  Using InMemorySessionService (conversations will be lost on restart)")
    print("  → Set USE_FIRESTORE=true in .env for persistent storage")
    session_service = InMemorySessionService()

created_sessions = set()
    
async def call_agent_async(query: str, runner, user_id, session_id):
    content = types.Content(role='user', parts=[types.Part(text=query)])
    final_response_text = "Agent did not produce a final response."

    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
        # Debug logging
        if hasattr(event, 'author'):
            print(f"  → Event from: {event.author}")

        if event.is_final_response():
            if event.content and event.content.parts:
                # Loop through all parts to find text
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        final_response_text = part.text.strip()
                        break
            elif event.actions and event.actions.escalate:
                final_response_text = f"Agent escalated: {event.error_message or 'No specific message.'}"
            break

    return final_response_text

async def run_conversation(query: str, app_name: str = "burbla", user_id: str = "something", session_id: str = "something"):
    """
    Main conversation flow:
    1. Find or create session in storage (Firestore or in-memory)
    2. Session contains conversation history
    3. Agent reads history and processes new message
    4. Runner automatically saves user message and agent response to session
    5. Return agent's response
    """
    try:
        # Step 1: Create or find existing session
        session_key = f"{app_name}:{user_id}:{session_id}"
        if session_key not in created_sessions:
            # Create new session in storage (Firestore or in-memory)
            session = await session_service.create_session(
                app_name = app_name, user_id = user_id, session_id = session_id
            )
            created_sessions.add(session_key)
            print(f"  🆕 New session created: '{session_id}'")
        else:
            print(f"  🔄 Existing session loaded: '{session_id}'")

        # Step 2: Create runner with session service
        # The runner will automatically load conversation history from the session
        runner_agent_team = Runner(
            agent=root_agent,
            app_name=app_name,
            session_service=session_service  # This handles reading/writing messages
        )

        # Step 3: Run agent
        # The runner automatically:
        # - Saves user message to session
        # - Loads conversation history
        # - Passes history to agent
        # - Saves agent response to session
        print(f"  🤖 Processing with agent...")
        response = await call_agent_async(
            query = query,
            runner = runner_agent_team,
            user_id = user_id,
            session_id = session_id
        )

        if not response or response == "Agent did not produce a final response.":
            print(f"  ⚠️  No response generated, using fallback")
            response = "I apologize, but I couldn't generate a response. Please try again."

        print(f"  💾 Messages saved to session")
        return response

    except Exception as e:
        print(f"  ❌ Error in run_conversation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
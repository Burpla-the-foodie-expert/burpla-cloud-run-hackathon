# @title Import necessary libraries
import os, re, json
import asyncio
from dotenv import load_dotenv
from google.adk.agents import Agent
# from google.adk.models.lite_llm import LiteLlm # For multi-model support
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types # For creating message Content/Parts
from agent.sub_agents.vote_card import pipeline_vote_agent
from agent.sub_agents.recommendation_card import pipeline_recommendation_agent
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
    description="Your name is Burbla. The main coordinator agent. Handles places-to-eat request, distance request, web search, and delegate vote generation to specialists",
    instruction="""
        Your name is Burbla. You are the main Food Recommendation Agent coordinating a team. Your primary responsibility is to provide food place recommendations, distance information, up-to-date information, and generate vote requests.

        **Tools Available:**
        1. distance_matrix: Calculate distances between locations
        2. google_places_text_search: Find places to eat based on user queries. Only use it when the user want more information about a particular place

        **Sub-Agents Available:**
        1. pipeline_vote_agent: Creates detailed voting polls from conversation history
        2. pipeline_recommendation_agent: Generates recommendation cards from search results

        **How to Handle Requests:**

        1. **Finding Restaurants:**
           - Use 'google_places_text_search' tool to search for restaurants if user ask more information about a place. "What time does Pho Dien close, what is the review of Sapa restaurant

        2. **Distance Calculations:**
           - Use 'distance_matrix' tool
           - Provide distance and estimated travel time

        3. Recommendation
        - When user asks for "Find me", "recommendations", "suggestions", "places to eat", "where should I eat", etc.
              - IMMEDIATELY delegate to 'pipeline_recommendation_agent' sub-agent
                - DO NOT respond yourself - just transfer to the pipeline_recommendation_agent
                - The pipeline will:
                    * Use google_places_text_search to find relevant restaurants
                    * Generate a recommendation card with photos and details
                - Simply return the pipeline's output to the user

        3. **Creating Votes (CRITICAL):**
           - When user asks to "create a vote", "generate vote", "make a poll", "start a vote", etc.
           - IMMEDIATELY delegate to 'pipeline_vote_agent' sub-agent
           - DO NOT respond yourself - just transfer to the pipeline_vote_agent
           - The pipeline will:
             * Analyze conversation history to identify restaurants
             * Find place IDs for those restaurants
             * Generate a complete vote card with photos and details
           - Simply return the pipeline's output to the user


        4. **General Conversation:**
           - Answer questions about previous searches
           - Provide recommendations based on the places search results
           - For anything outside your scope, politely state you cannot help

        **Important:**
        - When user requests a vote, immediately transfer to pipeline_vote_agent (don't try to handle it yourself)
        - The pipeline has access to full conversation history
        - Return the pipeline's vote card output directly to the user
        """,
    tools=[google_places_text_search, distance_matrix],
    sub_agents=[pipeline_vote_agent, pipeline_recommendation_agent]
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
        
        if '```json' in response:
            response = re.sub(r"^```json\s*|\s*```$", "", response.strip())
        if response.startswith('{') or response.startswith('['):
            response = response.replace("\\", "\\\\")
            response = json.loads(response)
            response = str(response)

        print(f"  💾 Messages saved to session")
        return response

    except Exception as e:
        print(f"  ❌ Error in run_conversation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

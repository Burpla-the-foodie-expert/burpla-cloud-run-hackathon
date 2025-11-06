import re, json, warnings, logging, os, sys, uuid
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from agent_gadk.sub_agents.vote_card import pipeline_vote_agent
from agent_gadk.sub_agents.recommendation_card import pipeline_recommendation_agent
from config import GEMINI_PRO, GEMINI_FLASH
from agent_gadk.tools import distance_matrix, google_places_text_search

warnings.filterwarnings('ignore')

load_dotenv(override=True)

root_agent = Agent(
    name="root_agent",
    model = GEMINI_FLASH,
    description="Your name is Burpla. The main coordinator agent. Handles places-to-eat request, distance request, web search, and delegate vote generation to specialists",
    instruction="""
        Your name is Burpla. You are the main Food Recommendation Agent coordinating a team. 
        Your primary responsibility is to provide food place recommendations, distance information, and generate vote requests, and answer other general questions.

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
           - Provide distance and estimated travel time base on transportation mode (driving, walking, etc.)

        3. Recommendation
        - When user asks for "Find me", "recommendations", "suggestions", "places to eat", "where should I eat", etc.
              - IMMEDIATELY delegate to 'pipeline_recommendation_agent' sub-agent
                - DO NOT respond yourself - just transfer to the pipeline_recommendation_agent
                - The pipeline will:
                    * Use google_places_text_search to find relevant restaurants
                    * Generate a recommendation card with photos and details
                - Simply return the pipeline's output to the user

        4. **Creating Votes (CRITICAL):**
           - When user asks to "create a vote", "generate vote", "make a poll", "start a vote", etc.
           - IMMEDIATELY delegate to 'pipeline_vote_agent' sub-agent
           - DO NOT respond yourself - just transfer to the pipeline_vote_agent
           - The pipeline will:
             * Analyze conversation history to identify restaurants
             * Find place IDs for those restaurants
             * Generate a complete vote card with photos and details
           - Simply return the pipeline's output to the user


        5. **General Conversation:**
           - If no tools or sub-agents are needed, respond directly to the user based on your knowledge.

        **Important:**
        - When user requests a vote, or recommendation immediately transfer to pipeline_vote_agent (don't try to handle it yourself)
        - The pipeline has access to full conversation history
        - The sub-agents must be in json format
        """,
    tools=[google_places_text_search, distance_matrix],
    sub_agents=[pipeline_vote_agent, pipeline_recommendation_agent]
)

session_service = InMemorySessionService()
created_sessions = set()

async def call_agent_async(query: str, runner, user_id, session_id):
    content = types.Content(role='user', parts=[types.Part(text=query)])
    final_response_text = "Agent did not produce a final response."

    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
        if event.is_final_response():
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        final_response_text = part.text.strip()
                        break
            elif event.actions and event.actions.escalate:
                final_response_text = f"Agent escalated: {event.error_message or 'No specific message.'}"
            break

    return final_response_text

async def run_conversation(query: str, app_name: str = "burpla", user_id: str = "something", session_id: str = "something"):
    try:
        app_name = "burpla"
        session_key = (app_name, user_id, session_id)
        if session_key not in created_sessions:
            await session_service.create_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id
            )
            created_sessions.add(session_key)
        print(app_name)
        runner_agent_team = Runner(
            agent=root_agent,
            app_name=app_name,
            session_service=session_service
        )

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

        return response

    except Exception as e:
        print(f"  ❌ Error in run_conversation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

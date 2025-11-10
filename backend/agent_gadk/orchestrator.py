import re, json, warnings, logging, os, sys, uuid
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.genai import types
from agent_gadk.sub_agents.vote_card import pipeline_vote_agent
from agent_gadk.sub_agents.recommendation_card import pipeline_recommendation_agent
from config import GEMINI_PRO, GEMINI_FLASH
from agent_gadk.tools import distance_matrix, google_places_text_search
from google.adk.sessions import InMemorySessionService
import asyncio, traceback

warnings.filterwarnings("ignore")

load_dotenv(override=True)

logger = logging.getLogger(__name__)
gen_cfg = types.GenerateContentConfig(
    temperature=0.1,
)

root_agent = Agent(
    name="root_agent",
    model=GEMINI_PRO,
    description="Your name is Burpla. The main coordinator agent. Handles places-to-eat request, distance request, web search, and delegate vote generation to specialists",
    instruction="""
        Your name is Burpla. You are the main Food Recommendation Agent coordinating a team.
        Your primary responsibility is to provide food place recommendations, distance information, and generate vote requests, and answer other general questions.

        IMPORTANT:
        * If you see the note: THIS IS A NON-AGENT QUERY, DO NOT RESPOND TO THE USER, don't respond to the user at all. But remember the conversation for future context.
        * Otherwise, follow the instructions below carefully.

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
        - The sub-agents must be in json executable format
        - Don't make up any information. If unsure, can ask the user for clarification.
        """,
    tools=[google_places_text_search, distance_matrix],
    generate_content_config=gen_cfg,
    sub_agents=[pipeline_vote_agent, pipeline_recommendation_agent],
)

# session_service = InMemorySessionService()

from google.adk.sessions import DatabaseSessionService
# Example using a local SQLite file:
db_url = "sqlite:///./my_agent_data.db"
session_service = DatabaseSessionService(db_url=db_url)\

created_sessions = set()

async def call_agent_async(
    query: str,
    runner,
    user_id,
    session_id,
):
    content = types.Content(role="user", parts=[types.Part(text=query)])
    final_response_text = "Agent did not produce a final response."

    try:
        async for event in runner.run_async(
            user_id=user_id, session_id=session_id, new_message=content
        ):
            if event.is_final_response():
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            final_response_text = part.text.strip()
                            break
                elif event.actions and event.actions.escalate:
                    final_response_text = (
                        f"Agent escalated: {event.error_message or 'No specific message.'}"
                    )
                break
    except ValueError as e:
        error_msg = str(e)
        if "Session not found" in error_msg:
            logger.error(f"❌ Session not found: {session_id}. Error: {error_msg}")
            # Try to recreate the session and retry once
            try:
                await session_service.create_session(
                    app_name=runner.app_name, user_id=user_id, session_id=session_id
                )
                logger.info(f"🔄 Recreated session {session_id}, retrying...")
                # Retry the call
                async for event in runner.run_async(
                    user_id=user_id, session_id=session_id, new_message=content
                ):
                    if event.is_final_response():
                        if event.content and event.content.parts:
                            for part in event.content.parts:
                                if hasattr(part, "text") and part.text:
                                    final_response_text = part.text.strip()
                                    break
                        elif event.actions and event.actions.escalate:
                            final_response_text = (
                                f"Agent escalated: {event.error_message or 'No specific message.'}"
                            )
                        break
            except Exception as retry_error:
                logger.error(f"❌ Failed to recreate session {session_id}: {retry_error}")
                raise ValueError(f"Session {session_id} not found and could not be recreated: {retry_error}")
        else:
            # Re-raise if it's a different ValueError
            raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in call_agent_async for session {session_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

    return final_response_text


def _looks_like_json(text: str) -> bool:
    if not isinstance(text, str):
        return False
    t = text.lstrip().lower()
    return "```json" in t or t.startswith("{") or t.startswith("[")

def _strip_json_fences(text: str) -> str:
    # Remove single-line or multi-line ```json ... ``` fences safely
    return re.sub(r"^\s*```json\s*|\s*```\s*$", "", text.strip(), flags=re.IGNORECASE)

async def run_conversation(
    query: str,
    app_name: str = "burpla",
    user_id: str = "something",
    session_id: str = "something",
):
    session_key = (app_name, session_id)
    # Always try to ensure session exists, even if we think we created it before
    # (in case of server restart or service reset)
    if session_key not in created_sessions:
        try:
            await session_service.create_session(
                app_name=app_name, user_id=user_id, session_id=session_id
            )
            created_sessions.add(session_key)
            logger.info(f"✅ Created session: {session_id} for user: {user_id}")
        except Exception as e:
            error_msg = str(e).lower()
            # If session already exists, that's fine - continue
            if "already exists" in error_msg or "duplicate" in error_msg:
                logger.info(f"ℹ️ Session {session_id} already exists, continuing...")
                created_sessions.add(session_key)
            else:
                # For other errors, log but still try to continue
                # The actual error will surface when we try to use the session
                logger.warning(f"⚠️ Session creation warning for {session_id}: {e}")
                created_sessions.add(session_key)

    runner_agent_team = Runner(
        agent=root_agent, app_name=app_name, session_service=session_service
    )

    # First run
    response = await call_agent_async(
        query=query,
        runner=runner_agent_team,
        user_id=user_id,
        session_id=session_id,
    )

    # If it doesn't look like JSON, return as-is (no retries)
    if not _looks_like_json(response):
        return response

    # It looks like JSON → try up to 3 attempts to parse valid JSON
    max_retries = 3
    last_raw = response
    for attempt in range(1, max_retries + 1):
        try:
            candidate = _strip_json_fences(last_raw)
            # Try to parse
            data = json.loads(candidate)
            # Attach message_id and return as JSON string
            if isinstance(data, dict):
                data["message_id"] = f"msm_{uuid.uuid4()}"
            return json.dumps(data)
        except Exception as e:
            print(f"⚠️ JSON parse failed (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                # Give back the last raw response if parsing never succeeded
                return last_raw
            # Re-run the agent only because it looked like JSON but failed to parse
            await asyncio.sleep(0.75)
            last_raw = await call_agent_async(
                query=query,
                runner=runner_agent_team,
                user_id=user_id,
                session_id=session_id,
            )
    return "Failed to generate valid response. Please try again"

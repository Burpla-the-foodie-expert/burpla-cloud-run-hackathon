from fastapi import APIRouter
from fastapi import FastAPI, HTTPException, Query, Body
from google.genai import types
import os, json, uuid
from dotenv import load_dotenv
from agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.session import SessionManager
from fastapi.responses import Response
from tools.google_map import plot_named_locations_googlemap
from base_models.db_models import UserMessage, AgentMessage, CreateMarkersRequest

import logging

logger = logging.getLogger(__name__)

user_manager = UserManager()
chat_manager = ChatManager()
session_manager = SessionManager()

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)

def get_all_chat_history_agent_ready(self, session_id):
    #User context
    members = session_manager.get_member_list(session_id)
    context = {"role": "system", "content": "User the user information for other preferences.\n User Information:\n"}

    for user_id in members:
        user_info = user_manager.get_user(user_id)
        context += f"User Name: {user_info[1]}, Preferences: {user_info[3]}, Location: {user_info[4]}\n"

    messages = chat_manager.load_chat_history(session_id)
    agent_ready_history = []
    for msg in messages:
        agent_ready_history.append({
            "role": msg["user_id"],
            "content": msg["content"]
        })
    
    return agent_ready_history

@router.post("/vote")
async def vote_card(
    session_id: str = Query(..., example="session_003"),
    user_id: str = Query(..., example="user_001"),
    message_id: str = Query(..., example="msg_006"),
    vote_option_id: str = Query(..., example="ChIJh4_KFyS_QIYRnyC9jmI-2F0"),
    is_vote_up: bool = Query(..., example=True),
):
    """Record a vote for a restaurant in a conversation session"""
    try:
        # Record the vote and get restaurant name
        restaurant_name = chat_manager.record_vote(
            session_id=session_id,
            user_id=user_id,
            message_id=message_id,
            vote_option_id=vote_option_id,
            is_vote_up=is_vote_up,
        )

        # If vote was successfully recorded, create a chat message and send to bot
        if restaurant_name:
            # Get user info to include their name in the message
            user_info = user_manager.get_user(user_id)
            user_name = user_info[1] if user_info else "User"

            # Create vote message
            vote_message = f"I voted for {restaurant_name}" if is_vote_up else f"I removed my vote for {restaurant_name}"

            # Save the vote as a chat message
            vote_message_id = f"msg_{str(uuid.uuid4())}"
            chat_manager.save_chat_message(
                session_id=session_id,
                user_id=user_id,
                message_id=vote_message_id,
                content=vote_message,
            )

            # Send the vote message to the bot agent for processing
            try:
                logger.info(f"📝 Vote message: {vote_message}")
                bot_response = await run_conversation(
                    vote_message, app_name="burpla", user_id=user_id, session_id=session_id
                )

                logger.info(f"✅ Bot response to vote: {bot_response}")

                # Save the bot's response
                response_message_id = f"msm_{str(uuid.uuid4())}"
                chat_manager.save_chat_message(
                    session_id=session_id,
                    user_id="bot",
                    message_id=response_message_id,
                    content=bot_response,
                )
            except Exception as bot_error:
                # Log the error but don't fail the vote - the vote was already recorded
                logger.error(f"Error sending vote message to bot: {bot_error}")
                import traceback
                logger.error(traceback.format_exc())

            logger.info(f"User {user_name} ({user_id}) voted for {restaurant_name} in session {session_id}")

        return {"status": "Vote recorded successfully"}
    except ValueError as e:
        logger.error(f"Error recording vote: {e}")
        # Return 400 for validation errors (like invalid JSON format)
        raise HTTPException(status_code=400, detail=str(e))
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error when recording vote: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON format in message content: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error recording vote: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/create_markers")
async def create_markers(request: CreateMarkersRequest):
    """Create map markers for restaurants in the conversation session."""
    html = plot_named_locations_googlemap(
        request.users_location, request.places_location
    )
    return Response(content=html, media_type="text/html")


@router.post("/sent", response_model=AgentMessage)
async def send_user_message(message: UserMessage):
    """Send message to agent and wait for response"""
    query = message.message
    user_id = str(message.user_id)
    owner_id = session_manager.get_owner_id(message.session_id) or 'anonymous'
    user_info = user_manager.get_user(user_id)
    session_id = message.session_id
    input_message_id = f"msg_{str(uuid.uuid4())}"

    if not user_info:
        # User not found - this shouldn't happen if authentication worked correctly
        # Raise an error to ensure data integrity
        error_msg = f"User {user_id} not found in users table. Please authenticate first."
        logger.error(error_msg)
        raise HTTPException(
            status_code=404,
            detail=error_msg
        )
    chat_manager.save_chat_message(
        session_id=session_id,
        user_id=user_id,
        message_id=input_message_id,
        content=query,
    )

    if message.is_to_agent:

        # Wrapper for user info
        query_wrapper = f"""
            Information about the user for more context: Name: {user_info[1]}, Preferences: {user_info[3]}, Location: {user_info[4]}
            Only use it if the user query requires more context about the user.
            Query: {query}
        """

        # logger.info(query_wrapper)
        logger.info(f"📝 Query: {query_wrapper}")
        response = await run_conversation(
            query,
            app_name="burpla",
            user_id=user_id,
            session_id=session_id,
        )

        logger.info(f"✅ Response: {response}")

        response_message_id = f"msm_{str(uuid.uuid4())}"
        chat_manager.save_chat_message(
            session_id=session_id,
            user_id="bot",
            message_id=response_message_id,
            content=response,
        )
        return AgentMessage(
            user_id="bot",
            name="Burpla",
            message=response,
            message_id=response_message_id,
        )
    else: 
        query_wrapper = f"""
            Note: THIS IS A NON-AGENT QUERY, DO NOT RESPOND TO THE USER.

            Information about the user for more context: Name: {user_info[1]}, Preferences: {user_info[3]}, Location: {user_info[4]}
            Only use it if the user query requires more context about the user.

            Query: {query}
            DON'T RESPOND TO THE USER.
        """
        # logger.info(query_wrapper)
        logger.info(f"📝 Query: {query_wrapper}")
        response = await run_conversation(
            query_wrapper,
            app_name="burpla",
            user_id=user_id,
            session_id=session_id,
        )
        return Response(status_code=204)  # No content response

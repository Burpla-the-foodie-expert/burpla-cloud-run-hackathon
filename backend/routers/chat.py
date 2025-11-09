from fastapi import APIRouter
from fastapi import FastAPI, HTTPException, Query, Body
import os, json, uuid
from dotenv import load_dotenv
from agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.session import SessionManager
from fastapi.responses import Response
from tools.google_map import plot_named_locations_googlemap
from base_models.base_models import UserMessage, AgentMessage, CreateMarkersRequest

import logging
logger = logging.getLogger(__name__)

user_manager = UserManager()
chat_manager = ChatManager()
convo_manager = SessionManager()

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)

@router.post("/vote")
async def vote_card(
    session_id: str = Query(..., example="session_003"),
    user_id: str = Query(..., example="user_001"),
    message_id: str = Query(..., example="msg_006"),
    vote_option_id: str = Query(..., example="ChIJh4_KFyS_QIYRnyC9jmI-2F0"),
    is_vote_up: bool = Query(..., example=True),
):
    """Record a vote for a restaurant in a conversation session"""
    chat_manager.record_vote(
        session_id=session_id,
        user_id=user_id,
        message_id=message_id,
        vote_option_id=vote_option_id,
        is_vote_up=is_vote_up,
    )
    return {"status": "Vote recorded successfully"}

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
    user_info = user_manager.get_user(user_id)
    session_id = message.session_id
    input_message_id = f"msg_{str(uuid.uuid4())}"

    if not user_info:
        return HTTPException(
            status_code=404,
            detail="User not found (Available users id: user_001, user_002, user_003)",
        )
    chat_manager.save_chat_message(
        session_id=session_id,
        user_id=user_id,
        message_id= input_message_id,
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
            query_wrapper, app_name="burpla", user_id=user_id, session_id=session_id
        )

        logger.info(f"✅ Response: {response}")

        response_message_id = f"msm_{str(uuid.uuid4())}"
        chat_manager.save_chat_message(
            session_id=session_id,
            user_id="bot",
            message_id=response_message_id,
            content=response,
        )
        convo_manager.update_last_updated(session_id)
        return AgentMessage(
            user_id="bot",
            name="Burpla",
            message=response,
            message_id=response_message_id,
        )

    convo_manager.update_last_updated(session_id)
    return Response(status_code=204)  # No content response



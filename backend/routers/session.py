from fastapi import APIRouter
from fastapi import HTTPException, Query, Body
import os, json, uuid

from agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.session import SessionManager
from fastapi.responses import Response
from tools.google_map import plot_named_locations_googlemap
from base_models.base_models import CreateSessionRequest, UpdateSessionRequest
import logging
logger = logging.getLogger(__name__)

user_manager = UserManager()
chat_manager = ChatManager()
convo_manager = SessionManager()

router = APIRouter(
    prefix="/session",
    tags=["session"],
)

@router.get("/get_all")
async def get_all_conversations(user_id: str = Query(..., example="user_001")):
    """Retrieve all available conversations on application startup based on user ID
    Available Id: user_001, user_002, user_003
    """
    if not convo_manager:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    convos = convo_manager.get_all(user_id)
    return convos

@router.get("/get")
async def get_conversation_session(session_id: str = Query(..., example="session_003")):
    """Retrieve conversation session by session ID, filtered to only include messages from session members"""
    # Get all messages for the session
    all_messages = chat_manager.load_chat_history(session_id)
    if not all_messages:
        return HTTPException(status_code=404, detail="Conversation session not found")

    # Get session members to filter messages
    convo = convo_manager.get(session_id)
    session_member_ids = set()

    if convo:
        # Session exists in convo table, use member_id_list
        member_list = convo["member_id_list"].split(",")
        for member_id in member_list:
            member_id = member_id.strip()
            if member_id:
                session_member_ids.add(member_id)
    else:
        # Session doesn't exist in convo table, extract members from messages
        # This handles dynamically created sessions
        for msg in all_messages:
            user_id = msg.get("user_id", "")
            if user_id and user_id not in ["bot", "burpla", "ai"]:
                session_member_ids.add(user_id)

    # Always include bot messages
    session_member_ids.add("bot")
    session_member_ids.add("burpla")
    session_member_ids.add("ai")

    # Filter messages to only include those from session members
    filtered_messages = [
        msg for msg in all_messages if msg.get("user_id", "") in session_member_ids
    ]

    return filtered_messages

@router.get("/get_users_info")
async def get_session_users_info(session_id: str = Query(..., example="session_001")):
    """Retrieve user information for all users in a conversation session"""
    convo = convo_manager.get(session_id)

    if convo:
        # Session exists in convo table, use member_id_list
        user_ids = convo["member_id_list"].split(",")
        users_info = []
        for user_id in user_ids:
            user_id = user_id.strip()  # Remove whitespace
            if not user_id:  # Skip empty strings
                continue
            user_info = user_manager.get_user(user_id)
            if user_info:
                users_info.append(
                    {
                        "user_id": user_info[0],
                        "name": user_info[1],
                        "email": user_info[2],
                        "preferences": user_info[3],
                        "location": user_info[4],
                    }
                )
        return users_info
    else:
        chat_messages = chat_manager.load_chat_history(session_id)
        if not chat_messages:
            return HTTPException(
                status_code=404, detail="Conversation session not found"
            )
        # Extract unique user IDs from messages (excluding bots)
        user_ids = set()
        for msg in chat_messages:
            user_id = msg.get("user_id", "")
            if user_id and user_id not in ["bot", "burpla", "ai"]:
                user_ids.add(user_id)

        # Get user info for each user ID
        users_info = []
        for user_id in user_ids:
            user_info = user_manager.get_user(user_id)
            if user_info:
                users_info.append(
                    {
                        "user_id": user_info[0],
                        "name": user_info[1],
                        "email": user_info[2],
                        "preferences": user_info[3],
                        "location": user_info[4],
                    }
                )
            else:
                users_info.append(
                    {
                        "user_id": user_id,
                        "name": user_id,  # Use user_id as name if not found
                        "email": None,
                        "preferences": None,
                        "location": None,
                    }
                )

        return users_info
    
@router.post("/create")
async def create_or_join_session(request: CreateSessionRequest):
    """Create a new session or join an existing one, saving to database"""
    owner_id = request.owner_id
    session_name = request.session_name or f"New Session"
    user_id_list = request.user_id_list

    session_id = "session_" + str(uuid.uuid4())
    member_list = ','.join(user_id_list)

    #Check if owner id exist
    owner_info = user_manager.get_user(owner_id)
    if not owner_info:
        return HTTPException(
            status_code=404,
            detail="Owner user not found (Available users id: user_001, user_002, user_003)",
        )

    #Create new session
    convo_manager.add_session(
        session_id=session_id,
        session_name=session_name,
        owner_id=owner_id,
        member_id_list=",".join(member_list),
    )

    # Initialize chat session if it doesn't exist (this creates a bot welcome message)
    chat_manager.load_chat_history(session_id)

    return {
        "success": True,
        "session_id": session_id,
        "message": "Session created successfully",
    }

#Update session name, and list of member


@router.post("/update")
async def update_session_info(request: UpdateSessionRequest):
    """Update session name and/or member list for an existing session"""
    convo = convo_manager.get(request.session_id)
    if not convo:
        return HTTPException(status_code=404, detail="Conversation session not found")

    session_id = request.session_id
    session_name = request.session_name
    member_id_list = request.member_id_list

    # Data type
    if isinstance(member_id_list, list):
        member_id_list = ','.join(member_id_list)

    # Update session
    convo.update(
        session_id=session_id,
        session_name=session_name,
        member_id_list=member_id_list,
    )
    return {
        "success": True,
        "message": "Session updated successfully",
    }

#Delete session
@router.delete("/delete")
async def delete_session(session_id: str = Query(..., example="session_003")):
    """Delete a conversation session by session ID"""
    convo = convo_manager.get(session_id)
    if not convo:
        return HTTPException(status_code=404, detail="Conversation session not found")

    # Delete the conversation session
    convo_manager.delete(session_id)

    return {
        "success": True,
        "message": "Session deleted successfully",
    }
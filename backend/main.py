from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
from dotenv import load_dotenv
import uuid
from agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.convo import ConvoManager
from fastapi.responses import Response
from tools.google_map import plot_named_locations_googlemap
load_dotenv(override=True)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print(
        "⚠️  WARNING: GOOGLE_API_KEY not found in environment. Some features may not work."
    )
    api_key = "NOT_SET"


user_manager = UserManager()
chat_manager = ChatManager()
convo_manager = ConvoManager()


app = FastAPI(
    title="FastAPI Template",
    description="A template for FastAPI applications",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConvoRequest(BaseModel):
    """Request to retrieve a specific conversation"""

    convo_id: int = Field(default=0)


class Conversation(BaseModel):
    """Conversation details with message history"""

    id: int
    name: str
    user_id_list: List[int]
    content: List[Dict[str, Any]] = Field(default=[])


class UserMessage(BaseModel):
    """User message payload"""

    user_id: str = Field(default="user_001")
    message: str = Field(default="Show me top 5 restaurant near Downtown Houston!")
    message_id: str = Field(default=f"msg_{str(uuid.uuid4())}")
    session_id: str = Field(default="")
    is_to_agent: Optional[bool] = Field(default=True)


class AgentMessage(BaseModel):
    """Agent response message"""

    user_id: str = Field(default=0)
    name: str = Field(default="Burpla")
    message: str
    message_id: str


@app.on_event("startup")
async def startup():
    port = os.getenv("PORT", "8000")
    print(f"🚀 Starting FastAPI server on port {port}")
    print(f"✓ API Key: {'configured' if api_key != 'NOT_SET' else 'missing'}")
    print(f"✓ Database: {'connected' if chat_manager is not None else 'disconnected'}")
    print(f"✓ Health check: http://localhost:{port}/health")
    print(f"✓ Docs: http://localhost:{port}/docs")


@app.get("/")
async def root():
    """Return API information and documentation links"""
    return {
        "message": "Welcome to FastAPI Template",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring service availability"""
    status = {
        "status": "healthy",
        "api_key": "configured" if api_key != "NOT_SET" else "missing",
        "database": "connected" if chat_manager is not None else "disconnected",
        "port": os.getenv("PORT", "8000"),
    }
    return status


@app.get("/convo_init")
async def get_all_conversations(user_id: str):
    """Retrieve all available conversations on application startup based on user ID
    Available Id: user_001, user_002, user_003
    """
    if not convo_manager:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    convos = convo_manager.list_convos_for_user(user_id)
    return convos


@app.get("/get_session")
async def get_conversation_session(session_id: str = Query(..., example="session_003")):
    """Retrieve conversation session by session ID"""
    convo = chat_manager.load_chat_history(session_id)
    if not convo:
        return HTTPException(status_code=404, detail="Conversation session not found")
    return convo


@app.get("/get_user_info")
async def get_user_info(user_id: str = Query(..., example="user_001")):
    """Retrieve user information by user ID"""
    user_info = user_manager.get_user(user_id)
    if not user_info:
        return HTTPException(
            status_code=404,
            detail="User not found (Available users id: user_001, user_002, user_003)",
        )
    return {
        "user_id": user_info[0],
        "name": user_info[1],
        "email": user_info[2],
        "preferences": user_info[3],
        "location": user_info[4],
    }


@app.get("/get_session_users_info")
async def get_session_users_info(session_id: str = Query(..., example="session_001")):
    """Retrieve user information for all users in a conversation session"""
    convo = convo_manager.get_convo(session_id)
    if not convo:
        return HTTPException(status_code=404, detail="Conversation session not found")

    user_ids = convo["member_id_list"].split(",")
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
    return users_info

# Vote card
@app.post("/vote")
async def vote_card(
    session_id: str = Query(..., example="session_003"),
    user_id: str = Query(..., example="user_001"),
    message_id: str = Query(..., example="msg_006"),
    vote_option_id: str = Query(..., example="ChIJh4_KFyS_QIYRnyC9jmI-2F0"),
    is_vote_up: bool = Query(..., example=True)
):
    """Record a vote for a restaurant in a conversation session"""
    chat_manager.record_vote(
        session_id=session_id,
        user_id=user_id,
        message_id=message_id,
        vote_option_id=vote_option_id,
        is_vote_up=is_vote_up
    )
    return {"status": "Vote recorded successfully"}


@app.post("/sent", response_model=AgentMessage)
async def send_user_message(message: UserMessage):
    """Send message to agent and wait for response"""
    query = message.message
    user_id = str(message.user_id)
    user_info = user_manager.get_user(user_id)
    session_id = message.session_id
    if not user_info:
        return HTTPException(
            status_code=404,
            detail="User not found (Available users id: user_001, user_002, user_003)",
        )

    chat_manager.save_chat_message(
        session_id=session_id,
        user_id=user_id,
        message_id=f"msg_{str(uuid.uuid4())}",
        content=query,
    )

    if message.is_to_agent:
        # Wrapper for user info
        query_wrapper = f"""
            Information about the user for more context: Name: {user_info[1]}, Preferences: {user_info[3]}, Location: {user_info[4]}
            Query: {query}
        """
        # print(query_wrapper)
        print(f"📝 Query: {query}")
        response = await run_conversation(
            query, app_name="burpla", user_id = user_id, session_id=session_id
        )

        print(f"✅ Response: {response}")

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

class UserLocation(BaseModel):
    user_name: str 
    address: str 

class PlaceLocation(BaseModel):
    place_name: str
    address: str
class CreateMarkersRequest(BaseModel):
    users_location: List[UserLocation] = Field(
        default=[
            {"user_name": "user_001", "address": "12315 Churchill Downs Dr Houston, TX 77047"},
            {"user_name": "user_002", "address": "11815 Catrose Ln, TX 77429"},
            {"user_name": "user_003", "address": "823 Malone Street 77007"}
        ]
    )
    places_location: List[PlaceLocation] = Field(
        default=[
            {"place_name": "EOG office", "address": "1111 Bagby St Lobby 2, Houston, TX 77002"},
            {"place_name": "China Town", "address": "11200 Bellaire Blvd, Houston, TX 77072"},
            {"place_name": "Chicha San Chen", "address": "9750 Bellaire Blvd, Houston, TX 77036"}
        ]
    )

@app.post("/create_markers")
async def create_markers(request: CreateMarkersRequest):
    """Create map markers for restaurants in the conversation session."""
    html = plot_named_locations_googlemap(request.users_location, request.places_location)
    return Response(content=html, media_type="text/html")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

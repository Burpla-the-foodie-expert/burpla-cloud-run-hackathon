from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
from dotenv import load_dotenv
import uuid
from backend.agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.convo import ConvoManager
from fastapi.responses import Response

load_dotenv(override=True)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("⚠️  WARNING: GOOGLE_API_KEY not found in environment. Some features may not work.")
    api_key = "NOT_SET"

try:
    chat_manager = ChatManager()
    user_manager = UserManager()
    convo_manager = ConvoManager()
    print("✅ Database managers initialized successfully")
except Exception as e:
    print(f"⚠️  WARNING: Database initialization failed: {e}")
    chat_manager = None
    user_manager = None
    convo_manager = None

app = FastAPI(
    title="FastAPI Template",
    description="A template for FastAPI applications",
    version="1.0.0"
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
    message: str = Field(default="Some me top 5 restaurant nearby!")
    message_id: str = Field(default=f'msg_{str(uuid.uuid4())}')
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
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring service availability"""
    status = {
        "status": "healthy",
        "api_key": "configured" if api_key != "NOT_SET" else "missing",
        "database": "connected" if chat_manager is not None else "disconnected",
        "port": os.getenv("PORT", "8000")
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
async def get_conversation_session(session_id: str):
    """Retrieve conversation session by session ID"""
    convo = chat_manager.load_chat_history(session_id)
    if not convo:
        return HTTPException(status_code=404, detail="Conversation session not found")
    return convo

@app.post("/sent", response_model=AgentMessage)
async def send_user_message(message: UserMessage):
    """Send message to agent and wait for response"""
    query = message.message
    user_id = str(message.user_id)
    user_info = user_manager.get_user(user_id)
    session_id = message.session_id
    if not user_info:
        return HTTPException(status_code=404, detail="User not found (Available users id: user_001, user_002, user_003)")

    chat_manager.save_chat_message(
        session_id=session_id,
        user_id=user_id,
        message_id=f'msg_{str(uuid.uuid4())}',
        content=query
    )

    if message.is_to_agent:
        # Wrapper for user info
        query_wrapper = f"""
            Information about the user for more context: Name: {user_info[1]}, Preferences: {user_info[3]}, Location: {user_info[4]}
            Query: {query}
        """
        print(query_wrapper)
        print(f"📝 Query: {query}")
        response = await run_conversation(query, app_name="burpla", user_id=user_id, session_id=session_id)

        print(f"✅ Response: {response}")

        response_message_id = f'msm_{str(uuid.uuid4())}'
        chat_manager.save_chat_message(
            session_id=session_id,
            user_id='bot',
            message_id=response_message_id,
            content=response
        )
        convo_manager.update_last_updated(session_id)

        return AgentMessage(
            user_id='bot',
            name="Burpla",
            message=response,
            message_id=response_message_id
        )
    
    convo_manager.update_last_updated(session_id)
    return Response(status_code=204) # No content response

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

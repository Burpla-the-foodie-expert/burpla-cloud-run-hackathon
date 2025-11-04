from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
from dotenv import load_dotenv
import uuid
# from cloud_hack_agent import vote_agent
from agent.agent import run_conversation
import google.genai as genai
from google.genai import types

load_dotenv(override=True)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment. Check .env file.")

client = genai.Client(api_key=api_key)

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

with open('convo_sample.json') as f:
    sample_conversation_content = json.load(f)

conversations = [{
    'convo_id': 1,
    'convo_name': 'No Name',
    'convo_user_ids': [1, 2, 3],
    'convo_content': sample_conversation_content
}]

@app.on_event("startup")
async def startup():
    print(f"✓ API Key loaded: {api_key[:10]}...")
    print("✓ Server started successfully!")
    print(f"✓ Docs available at: http://localhost:8000/docs")


class ConversationList(BaseModel):
    conversations: List[Dict[str, Any]] = Field(
        default=[],
        description="List of available conversations",
        examples=[[{
            "convo_id": 1,
            "convo_name": "Dinner Planning",
            "convo_user_ids": [1, 2, 3]
        }]]
    )


class ConvoRequest(BaseModel):
    convo_id: int = Field(default=0, description="Conversation ID to retrieve", examples=[1])


class Conversation(BaseModel):
    id: int = Field(description="Conversation ID", examples=[1])
    name: str = Field(description="Conversation name", examples=["Dinner Planning"])
    user_id_list: List[int] = Field(description="List of user IDs", examples=[[1, 2, 3]])
    content: List[Dict[str, Any]] = Field(description="Message history", default=[])


class UserMessage(BaseModel):
    user_id: int = Field(default=1, description="User ID")
    message: str = Field(description="Message text", examples=["Find me Italian restaurants in Houston 77083"])
    message_id: str = Field(default="something", description="Message ID (auto-generated)")
    session_id : str = Field(default="something", description="Session ID (auto-generated)")
    is_to_agent: Optional[bool] = Field(default=True, description="If true, send to AI agent, otherwise, send to human")

class AgentMessage(BaseModel):
    user_id: int = Field(default=0, description="Agent user ID")
    name: str = Field(default="Burpla", description="Agent name")
    message: str = Field(description="Agent response", examples=["I found 5 restaurants in Houston 77083!"])
    message_id: str = Field(description="Message ID")

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
    return {"status": "healthy"}


@app.post("/clear_session")
async def clear_session(session_id: str):
    """Clear a specific session to start fresh"""
    from agent.agent import created_sessions, session_service

    # Remove from created_sessions tracking
    keys_to_remove = [key for key in created_sessions if session_id in key]
    for key in keys_to_remove:
        created_sessions.remove(key)

    return {"status": "success", "message": f"Session '{session_id}' cleared", "cleared_keys": keys_to_remove}


@app.get("/sessions/{user_id}")
async def list_user_sessions(user_id: int):
    """List all sessions for a user"""
    from agent.agent import session_service
    from agent.config import USE_FIRESTORE

    if not USE_FIRESTORE:
        return {"error": "Session listing only available with Firestore", "use_firestore": False}

    try:
        sessions = await session_service.list_sessions(
            app_name="burbla",
            user_id=str(user_id)
        )
        return {
            "user_id": user_id,
            "total_sessions": len(sessions),
            "sessions": sessions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing sessions: {str(e)}")


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str, user_id: int = 1):
    """Get full conversation history for a session"""
    from agent.agent import session_service

    try:
        session = await session_service.get_session(
            app_name="burbla",
            user_id=str(user_id),
            session_id=session_id
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "messages": session.get("messages", []),
            "created_at": session.get("created_at"),
            "updated_at": session.get("updated_at"),
            "message_count": len(session.get("messages", []))
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving session: {str(e)}")


@app.delete("/session/{session_id}")
async def delete_session_endpoint(session_id: str, user_id: int = 1):
    """Delete a session permanently"""
    from agent.agent import session_service, created_sessions
    from agent.config import USE_FIRESTORE

    try:
        if USE_FIRESTORE:
            await session_service.delete_session(
                app_name="burbla",
                user_id=str(user_id),
                session_id=session_id
            )

        # Remove from tracking
        keys_to_remove = [key for key in created_sessions if session_id in key]
        for key in keys_to_remove:
            created_sessions.remove(key)

        return {
            "status": "success",
            "message": f"Session '{session_id}' deleted",
            "cleared_keys": keys_to_remove
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")


@app.get("/storage_info")
async def storage_info():
    """Get information about current storage configuration"""
    from agent.config import USE_FIRESTORE, GOOGLE_CLOUD_PROJECT, FIRESTORE_COLLECTION

    return {
        "storage_type": "firestore" if USE_FIRESTORE else "in_memory",
        "persistent": USE_FIRESTORE,
        "project_id": GOOGLE_CLOUD_PROJECT if USE_FIRESTORE else None,
        "collection": FIRESTORE_COLLECTION if USE_FIRESTORE else None,
        "warning": None if USE_FIRESTORE else "Using in-memory storage. Conversations will be lost on restart."
    }


@app.get("/init", response_model=ConversationList)
async def get_all_conversations():
    """Retrieve all available conversations on application startup"""
    res = []
    for convo in conversations:
        item = {}
        for key in convo:
            if key != 'convo_content':
                item[key] = convo[key]
        res.append(item)
    return {"conversations": res}


@app.post("/convo", response_model=Conversation)
async def get_conversation_by_id(request: ConvoRequest):
    """Retrieve a specific conversation by its ID"""
    convo = next((c for c in conversations if c['convo_id'] == request.convo_id), None)

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": convo['convo_id'],
        "name": convo['convo_name'],
        "user_id_list": convo['convo_user_ids'],
        "content": convo['convo_content']
    }


@app.post("/sent", response_model=AgentMessage)
async def send_user_message(message: UserMessage):
    """Send message to agent and wait for response"""
    if message.is_to_agent:
        message_id = str(uuid.uuid4())
        try:
            query = message.message
            user_id = str(message.user_id)
            session_id = message.session_id
            

            print(f"📨 User {user_id} | Session {session_id}")
            print(f"📝 Query: {query}")

            response = await run_conversation(query, app_name = "burbla", user_id = user_id, session_id = session_id)

            if not response:
                response = "No response generated"

            print(f"✅ Response: {response[:100]}...")

            agent_message = AgentMessage(
                user_id=0,
                name="Burpla",
                message=response,
                message_id=message_id
            )
            return agent_message

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()

            error_message = AgentMessage(
                user_id=0,
                name="Burpla",
                message=f"Error: {str(e)}",
                message_id=str(uuid.uuid4())
            )
            return error_message
    else:
        return AgentMessage(
            user_id=0,
            name="Burpla",
            message="Message received",
            message_id=message.message_id
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

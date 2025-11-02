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

load_dotenv(dotenv_path="cloud_hack_agent/.env", override=True)

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment. Check cloud_hack_agent/.env file.")

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
            print(query)
            response = await run_conversation(query, app_name = "burbla", user_id = user_id, session_id = session_id)
            agent_message = AgentMessage(
                user_id=0,
                name="Burpla",
                message=response,
                message_id=message_id
            )
            return agent_message

        except Exception as e:
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

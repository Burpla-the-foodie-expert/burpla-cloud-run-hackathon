from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import json
from dotenv import load_dotenv
import uuid
from cloud_hack_agent import vote_agent
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

messages_db = {}

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
    user_id: int = Field(description="User ID", examples=[1])
    name: str = Field(description="User name", examples=["Huy Bui"])
    message: str = Field(description="Message text", examples=["Find me Italian restaurants in Houston 77083"])
    id: str = Field(default="", description="Message ID (auto-generated)")
    is_to_agent: Optional[bool] = Field(default=True, description="If true, send to AI agent, otherwise, send to human")


class AgentMessage(BaseModel):
    user_id: int = Field(default=0, description="Agent user ID")
    name: str = Field(default="Burpla", description="Agent name")
    message: str = Field(description="Agent response", examples=["I found 5 restaurants in Houston 77083!"])
    id: str = Field(description="Message ID")


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
    user_message_id = str(uuid.uuid4())
    messages_db[user_message_id] = message.model_dump()

    if message.is_to_agent or not message.is_to_agent:
        try:
            if vote_agent.should_handle(message.message):
                vote_result = vote_agent.execute(message.message)
                agent_response_text = json.dumps(vote_result)
            else:
                response = client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=message.message
                )
                agent_response_text = response.text

            agent_message = AgentMessage(
                user_id=0,
                name="Burpla",
                message=agent_response_text,
                id=str(uuid.uuid4())
            )

            messages_db[agent_message.id] = agent_message.model_dump()
            return agent_message

        except Exception as e:
            error_message = AgentMessage(
                user_id=0,
                name="Burpla",
                message=f"Error: {str(e)}",
                id=str(uuid.uuid4())
            )
            messages_db[error_message.id] = error_message.model_dump()
            return error_message
    else:
        return AgentMessage(
            user_id=0,
            name="Burpla",
            message="Message received",
            id=str(uuid.uuid4())
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

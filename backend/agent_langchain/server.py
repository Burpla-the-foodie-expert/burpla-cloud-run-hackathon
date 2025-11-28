from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langserve import add_routes
from .agent import agent
import uvicorn
import os
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
import json
import asyncio

app = FastAPI(
    title="LangGraph Agent Server",
    version="1.0",
    description="A simple API server using LangChain's Runnable interfaces",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the agent routes
add_routes(
    app,
    agent,
    path="/agent",
)

@app.get("/health")
async def health():
    return {"status": "ok"}

from typing import Optional

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None

def serialize_chunk(chunk):
    if isinstance(chunk, dict):
        return {k: serialize_chunk(v) for k, v in chunk.items()}
    if isinstance(chunk, list):
        return [serialize_chunk(i) for i in chunk]
    if hasattr(chunk, "model_dump"):
        return chunk.model_dump()
    if hasattr(chunk, "dict"):
        return chunk.dict()
    return str(chunk)

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def event_generator():
        inputs = {"messages": [HumanMessage(content=request.message)]}
        config = {"configurable": {"thread_id": request.thread_id}} if request.thread_id else None
        async for chunk in agent.astream(inputs, config=config):
            # Serialize the chunk properly
            serialized_chunk = serialize_chunk(chunk)
            yield f"data: {json.dumps(serialized_chunk)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

class UserMessage(BaseModel):
    user_id: str
    message: str
    session_id: str
    is_to_agent: bool = True

import uuid

@app.post("/chat/sent")
async def chat_sent(request: UserMessage):
    inputs = {"messages": [HumanMessage(content=request.message)]}
    config = {"configurable": {"thread_id": request.session_id}}

    # Invoke the agent
    result = await agent.ainvoke(inputs, config=config)

    # Extract the last message content
    last_message = result["messages"][-1]
    response_content = last_message.content

    return {
        "user_id": "bot",
        "name": "Burpla",
        "message": response_content,
        "message_id": str(uuid.uuid4())
    }


def start():
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    start()

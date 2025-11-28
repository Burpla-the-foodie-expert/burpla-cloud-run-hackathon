from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from .models import SessionLocal, Message, User
from .pubsub import get_pubsub_client
import json
from datetime import datetime

router = APIRouter(prefix="/ws", tags=["websocket"])
redis_client = get_pubsub_client()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ConnectionManager:
    def __init__(self):
        # Map group_id -> list of WebSockets
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str, group_id: str):
        if group_id in self.active_connections:
            for connection in self.active_connections[group_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/{group_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, group_id: str, user_id: str, db: Session = Depends(get_db)):
    await manager.connect(websocket, group_id)

    # Subscribe to Redis channel for this group (if not already handled globally)
    # Note: In a real app, you'd have a separate worker or background task listening to Redis
    # and broadcasting to local websockets via the manager.

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            content = message_data.get("content")

            # 1. Save to DB (Cloud SQL)
            new_msg = Message(
                group_id=group_id,
                user_id=user_id,
                content=content,
                timestamp=datetime.utcnow()
            )
            db.add(new_msg)
            db.commit()

            # 2. Publish to Redis (Cloud Memorystore)
            # This ensures other Cloud Run instances get this message
            redis_msg = {
                "group_id": group_id,
                "user_id": user_id,
                "content": content,
                "timestamp": new_msg.timestamp.isoformat()
            }
            redis_client.publish(f"group_{group_id}", redis_msg)

            # 3. Broadcast locally (optimization: send to local clients immediately)
            await manager.broadcast(json.dumps(redis_msg), group_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, group_id)
        await manager.broadcast(f"User {user_id} left the chat", group_id)

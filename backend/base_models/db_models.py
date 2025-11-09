from pydantic import BaseModel, Field
from fastapi import Body
from typing import Optional, List, Dict, Any
import uuid

class ConvoRequest(BaseModel):
    """Request to retrieve a specific conversation"""
    session_id: int = Field(default=0)

class Conversation(BaseModel):
    """Conversation details with message history"""
    id: int
    name: str
    user_id_list: List[int]
    content: List[Dict[str, Any]] = Field(default=[])


class CreateSessionRequest(BaseModel):
    """Request to create or join a session"""
    session_name: Optional[str] = Field(default="New Session")
    owner_id: str = Field(default="user_001")
    user_id_list: List = Field(default=["user_001", "user_002"])

class UserMessage(BaseModel):
    """User message payload"""
    user_id: str = Field(default="user_001")
    message: str = Field(default="Show me top 5 restaurant near Downtown Houston!")
    session_id: str = Field(default=f"session_{uuid.uuid4()}")
    is_to_agent: Optional[bool] = Field(default=True)

class AgentMessage(BaseModel):
    """Agent response message"""
    user_id: str = Field(default=0)
    name: str = Field(default="Burpla")
    message: str
    message_id: str

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

class AuthenticationRequest(BaseModel):
    gmail: str  = Field(default="williamhuybui@gmail.com")
    name: Optional[str] = None

class UserInfo(BaseModel):
    user_id: str = Field(default="user_001")
    name: Optional[str] = None
    gmail: Optional[str] = None
    preferences: Optional[str] = None
    location: Optional[str] = None

class UpdateSessionRequest(BaseModel):
    session_id: str = Body(default="session_003")
    session_name: Optional[str] = Body(default = "New Session Name")
    member_id_list: Optional[list[str]] = Body(default=["user_001", "user_002"])

class JoinSessionRequest(BaseModel):
    """Request to join an existing session"""
    session_id: str = Field(..., example="session_003")
    user_id: str = Field(..., example="user_001")

from fastapi import APIRouter
from fastapi import FastAPI, HTTPException, Query, Body
from agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.session import SessionManager
from base_models.base_models import UserInfo
import logging
logger = logging.getLogger(__name__)

user_manager = UserManager()
chat_manager = ChatManager()
convo_manager = SessionManager()

router = APIRouter(
    prefix="/user",
    tags=["user"],
)

@router.get("/get")
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

@router.post("/update")
async def update_user_info(request: UserInfo):
    """Update user information in the database."""
    user_manager.update_user(
        user_id=request.user_id,
        name=request.name,
        gmail=request.gmail,
        preferences=request.preferences,
        location=request.location,
    )
    return {"status": "User information updated successfully"}

#Add user
@router.post("/add")
async def add_user(request: UserInfo):
    """Add a new user to the database."""
    existing_user = user_manager.get_user(request.user_id)
    if existing_user:
        return HTTPException(
            status_code=400,
            detail="User ID already exists. Please choose a different user ID.",
        )
    user_manager.add_user(
        user_id=request.user_id,
        name=request.name,
        gmail=request.gmail,
        preferences=request.preferences,
        location=request.location,
    )
    return {"status": "User added successfully"}
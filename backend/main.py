from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from db_services.chat import ChatManager
from db_services.user import UserManager
from db_services.session import SessionManager
from base_models.base_models import AuthenticationRequest
from routers import chat, user, session

load_dotenv(override=True)

# Initialize database managers
user_manager = UserManager()
chat_manager = ChatManager()
convo_manager = SessionManager()

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

app.include_router(chat.router)
app.include_router(session.router)
app.include_router(user.router)

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
        "port": os.getenv("PORT", "8000"),
    }
    return status

# POST 
@app.post("/authentication")
async def authentication(request: AuthenticationRequest):
    """Simple authentication endpoint if user exists based on gmail"""
    is_authenticated = user_manager.authentication(request.gmail)
    if not is_authenticated:
        return {"is_authenticated": False, "detail": "Authentication failed"}
    return {"is_authenticated": True, "detail": "Authentication successful"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
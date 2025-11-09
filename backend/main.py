from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
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

# Configure CORS middleware - must be added before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://burpla-ui-415080714475.northamerica-northeast1.run.app", # Production frontend URL
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception handlers - CORS middleware will automatically add headers to these responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
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
    """Authenticate user by gmail. Creates new user if they don't exist."""
    try:
        print(f"[AUTH] Received request: gmail={request.gmail}, name={request.name}")
        is_authenticated, user_id = user_manager.authentication(request.gmail, request.name)
        print(f"[AUTH] Result: is_authenticated={is_authenticated}, user_id={user_id}")
        if not is_authenticated:
            print(f"[AUTH] Authentication failed for {request.gmail}")
            return {"is_authenticated": False, "detail": "Authentication failed"}
        print(f"[AUTH] Authentication successful for {request.gmail}, user_id={user_id}")
        return {
            "is_authenticated": True,
            "detail": "Authentication successful",
            "user_id": user_id
        }
    except Exception as e:
        import traceback
        print(f"[AUTH] Authentication error: {e}")
        print(traceback.format_exc())
        return {"is_authenticated": False, "detail": f"Authentication error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

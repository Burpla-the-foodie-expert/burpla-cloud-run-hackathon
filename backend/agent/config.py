import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Model Configuration
# Using gemini-2.5-pro which supports function calling with google-genai SDK
ROOT_MODEL_NAME = "gemini-2.0-flash"
SUB_MODEL_NAME = "gemini-2.0-flash"

# Firestore Configuration
USE_FIRESTORE = os.getenv("USE_FIRESTORE", "false").lower() == "true"
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
FIRESTORE_COLLECTION = os.getenv("FIRESTORE_COLLECTION", "agent_sessions")

# Session Configuration
DEFAULT_APP_NAME = "burbla"
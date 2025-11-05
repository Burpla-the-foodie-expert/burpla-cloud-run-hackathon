import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Model Configuration
# Using gemini-2.5-pro which supports function calling with google-genai SDK
ROOT_MODEL_NAME = "gemini-2.0-flash"
SUB_MODEL_NAME = "gemini-2.5-pro"

# Session Configuration
DEFAULT_APP_NAME = "burbla"
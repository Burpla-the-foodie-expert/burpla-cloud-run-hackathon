import os
from dotenv import load_dotenv

load_dotenv(override=True)

# Model Configuration
# Using gemini-2.5-pro which supports function calling with google-genai SDK
GEMINI_FLASH = "gemini-2.0-flash"
GEMINI_PRO = "gemini-2.5-pro"

# Session Configuration
DATABASE_PATH = "database/burpla.db"
DEFAULT_APP_NAME = "burpla"
